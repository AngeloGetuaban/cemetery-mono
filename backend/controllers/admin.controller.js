const pool = require("../config/database");

// Example: dashboard metrics
async function dashboardMetrics(req, res, next) {
  try {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM users) AS users,
        (SELECT COUNT(*) FROM plots) AS plots,
        (SELECT COUNT(*) FROM graves) AS graves,
        (SELECT COUNT(*) FROM maintenance_requests WHERE status <> 'closed') AS open_maintenance
    `;
    const { rows } = await pool.query(sql);
    res.json(rows[0]);
  } catch (err) { next(err); }
}

function parseLatLngFromString(s) {
  if (!s || typeof s !== "string") return null;
  const t = s.trim();

  // WKT: POINT (lng lat)
  const mPoint = t.match(/^POINT\s*\(\s*([+-]?\d+(?:\.\d+)?)\s+([+-]?\d+(?:\.\d+)?)\s*\)$/i);
  if (mPoint) {
    const lng = Number(mPoint[1]);
    const lat = Number(mPoint[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  // "lat, lng" or "lat lng"
  const mPair = t.match(/^\s*([+-]?\d+(?:\.\d+)?)\s*,?\s+([+-]?\d+(?:\.\d+)?)\s*$/);
  if (mPair) {
    const lat = Number(mPair[1]);
    const lng = Number(mPair[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return null;
}

function genUid() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < 5; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function makePlotHandlers(tableName) {
  // check uid uniqueness within the table
  const isUidTaken = async (uid) => {
    const { rows } = await pool.query(`SELECT 1 FROM ${tableName} WHERE uid = $1 LIMIT 1`, [uid]);
    return rows.length > 0;
  };

  const add = async (req, res, next) => {
    try {
      const actor = req.user;
      if (!actor || !["admin", "super_admin"].includes(actor.role)) {
        return res.status(403).json({ error: "Forbidden: admin only" });
      }

      const {
        uid: uidRaw,
        plot_name,
        plot_type,
        size_sqm,
        status: statusRaw,
        latitude,
        longitude,
        coordinates: coordinatesRaw,
      } = req.body || {};

      // derive lat/lng
      let latLng = null;
      if (
        latitude != null &&
        longitude != null &&
        String(latitude).trim() !== "" &&
        String(longitude).trim() !== ""
      ) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) latLng = { lat, lng };
      }
      if (!latLng && typeof coordinatesRaw === "string" && coordinatesRaw.trim() !== "") {
        latLng = parseLatLngFromString(coordinatesRaw);
      }

      // status default
      const status = (statusRaw && String(statusRaw).trim() !== "") ? statusRaw : "available";

      // 5-char uid
      let uid = (typeof uidRaw === "string" && uidRaw.length === 5) ? uidRaw : null;
      if (uid && await isUidTaken(uid)) uid = null;
      if (!uid) {
        let attempts = 0;
        while (attempts++ < 10) {
          const cand = genUid();
          if (!(await isUidTaken(cand))) { uid = cand; break; }
        }
        if (!uid) return res.status(500).json({ error: "Failed to generate unique uid" });
      }

      // Build INSERT (geometry via ST_MakePoint)
      const cols = ["uid","plot_name", "plot_type", "size_sqm", "status", "created_at", "updated_at"];
      const vals = ["$1", "$2", "$3", "$4", "$5", "NOW()", "NOW()"];
      const params = [uid, plot_name ?? null, plot_type ?? null, size_sqm ?? null, status];

      if (latLng) {
        cols.push("coordinates");
        // 2 params for lng/lat; ST_SetSRID(ST_MakePoint($7,$8), 4326)
        vals.push("ST_SetSRID(ST_MakePoint($6, $7), 4326)");
        params.push(Number(latLng.lng), Number(latLng.lat));
      }

      const sql = `
        INSERT INTO ${tableName} (${cols.join(", ")})
        VALUES (${vals.join(", ")})
        RETURNING *
      `;
      const { rows } = await pool.query(sql, params);
      return res.status(201).json(rows[0]);
    } catch (err) { next(err); }
  };

  const edit = async (req, res, next) => {
    try {
      const id = req.body?.id ?? req.params?.id;
      if (!id) return res.status(400).json({ error: "id is required" });

      const {
        uid,
        plot_name,
        plot_type,
        size_sqm,
        status,
        latitude,
        longitude,
        coordinates: coordinatesRaw,
      } = req.body || {};

      // derive lat/lng (same logic as add)
      let latLng = null;
      if (
        latitude != null && longitude != null &&
        String(latitude).trim() !== "" && String(longitude).trim() !== ""
      ) {
        const lat = Number(latitude);
        const lng = Number(longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) latLng = { lat, lng };
      }
      if (!latLng && typeof coordinatesRaw === "string" && coordinatesRaw.trim() !== "") {
        latLng = parseLatLngFromString(coordinatesRaw);
      }

      const sets = [];
      const params = [];
      let i = 1;
      const addSet = (col, val) => {
        if (typeof val !== "undefined") {
          sets.push(`${col} = $${i++}`);
          params.push(val);
        }
      };

      addSet("uid", uid);
      addSet("plot_name", plot_name);
      addSet("plot_type", plot_type);
      addSet("size_sqm", size_sqm);
      addSet("status", status);

      if (latLng) {
        // coordinates = ST_SetSRID(ST_MakePoint($i,$i+1),4326)
        sets.push(`coordinates = ST_SetSRID(ST_MakePoint($${i}, $${i + 1}), 4326)`);
        params.push(Number(latLng.lng), Number(latLng.lat));
        i += 2;
      }

      // Always bump updated_at
      sets.push("updated_at = NOW()");

      if (sets.length === 1) {
        return res.status(400).json({ error: "No updatable fields provided" });
      }

      const sql = `UPDATE ${tableName} SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`;
      params.push(id);

      const { rows } = await pool.query(sql, params);
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      return res.json(rows[0]);
    } catch (err) { next(err); }
  };

  const del = async (req, res, next) => {
    try {
      const actor = req.user;
      if (!actor || !["admin", "super_admin"].includes(actor.role)) {
        return res.status(403).json({ error: "Forbidden: admin only" });
      }

      const raw = req.params?.id ?? req.body?.id;
      if (!raw) return res.status(400).json({ error: "id (or uid) is required" });

      const sql = `
        DELETE FROM ${tableName}
        WHERE id::text = $1 OR uid = $1
        RETURNING id, uid, plot_name
      `;
      const { rows } = await pool.query(sql, [String(raw)]);
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });

      const d = rows[0];
      return res.json({ ok: true, deleted_id: d.id, deleted_uid: d.uid, plot_name: d.plot_name });
    } catch (err) {
      if (err && err.code === "23503") {
        return res.status(409).json({
          error: "Cannot delete: referenced by other records.",
          code: "FK_CONSTRAINT",
        });
      }
      next(err);
    }
  };

  return { add, edit, del };
}

/* ---------------- create handlers for both new tables ---------------- */
const BPlotsHandlers = makePlotHandlers("plots");
const RoadHandlers = makePlotHandlers("road_plots");
const BuildingHandlers = makePlotHandlers("building_plots");

// Expose named functions you asked for:
const addPlots = BPlotsHandlers.add;
const editPlots = BPlotsHandlers.edit;
const deletePlots = BPlotsHandlers.del;

const addRoadPlots = RoadHandlers.add;
const editRoadPlots = RoadHandlers.edit;
const deleteRoadPlots = RoadHandlers.del;

const addBuildingPlots = BuildingHandlers.add;
const editBuildingPlots = BuildingHandlers.edit;
const deleteBuildingPlots = BuildingHandlers.del;

module.exports = {
  dashboardMetrics,
  addPlots,
  editPlots,
  deletePlots,
  // road_plots
  addRoadPlots,
  editRoadPlots,
  deleteRoadPlots,
  // building_plots
  addBuildingPlots,
  editBuildingPlots,
  deleteBuildingPlots,
};