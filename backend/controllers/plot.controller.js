// backend/controllers/plot.controller.js
const pool = require('../config/database');

/* ---------- existing handlers (rename to named funcs) ---------- */
async function getPlotsGeoJSON(req, res, next) {
  const { status = null, section = null } = req.query;
  const filters = [];
  const params = [];
  if (status) { params.push(status); filters.push(`status = $${params.length}`); }
  if (section) { params.push(section); filters.push(`plot_name = $${params.length}`); }
  const whereSQL = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  try {
    const { rows } = await pool.query(
      `
      WITH base AS (
        SELECT id, uid, plot_name, plot_type, size_sqm, status,
               created_at, updated_at, COALESCE(coordinates) AS geom
        FROM plots
        ${whereSQL}
      ),
      feats AS (
        SELECT id,
               json_build_object(
                 'type','Feature','id', id,
                 'geometry', ST_AsGeoJSON(geom)::json,
                 'properties', json_build_object(
                   'id', id,'uid', uid,'plot_name', plot_name,'plot_type', plot_type,
                   'size_sqm', size_sqm,'status', status,'created_at', created_at,'updated_at', updated_at
                 )
               ) AS f
        FROM base
        WHERE geom IS NOT NULL
      )
      SELECT json_build_object('type','FeatureCollection',
                               'features', COALESCE(json_agg(f ORDER BY id), '[]'::json)) AS geojson
      FROM feats;
      `,
      params
    );
    res.json(rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] });
  } catch (err) { next(err); }
}

async function getPlotById(req, res, next) {
  const idNum = Number(req.params.id);
  if (!Number.isFinite(idNum)) return res.status(400).json({ ok: false, error: 'Invalid plot id' });

  try {
    const { rows } = await pool.query(
      `
      SELECT json_build_object(
        'type','Feature','id', id,
        'geometry', ST_AsGeoJSON(COALESCE(coordinates))::json,
        'properties', json_build_object(
          'id', id,'uid', uid,'plot_name', plot_name,'plot_type', plot_type,
          'size_sqm', size_sqm,'status', status,'created_at', created_at,'updated_at', updated_at
        )
      ) AS feature
      FROM plots
      WHERE id = $1
      `,
      [idNum]
    );
    if (!rows.length || !rows[0].feature) return res.status(404).json({ ok: false, error: 'Plot not found' });
    res.json(rows[0].feature);
  } catch (err) { next(err); }
}

/* ---------- factories to reuse SQL for other tables ---------- */
function makeGetPlotsGeoJSON(table) {
  return async (req, res, next) => {
    const { status = null, section = null } = req.query;
    const filters = [];
    const params = [];
    if (status) { params.push(status); filters.push(`status = $${params.length}`); }
    if (section) { params.push(section); filters.push(`plot_name = $${params.length}`); }
    const whereSQL = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    try {
      const { rows } = await pool.query(
        `
        WITH base AS (
          SELECT id, uid, plot_name, plot_type, size_sqm, status,
                 created_at, updated_at, COALESCE(coordinates) AS geom
          FROM ${table}
          ${whereSQL}
        ),
        feats AS (
          SELECT id,
                 json_build_object(
                   'type','Feature','id', id,
                   'geometry', ST_AsGeoJSON(geom)::json,
                   'properties', json_build_object(
                     'id', id,'uid', uid,'plot_name', plot_name,'plot_type', plot_type,
                     'size_sqm', size_sqm,'status', status,'created_at', created_at,'updated_at', updated_at
                   )
                 ) AS f
          FROM base
          WHERE geom IS NOT NULL
        )
        SELECT json_build_object('type','FeatureCollection',
                                 'features', COALESCE(json_agg(f ORDER BY id), '[]'::json)) AS geojson
        FROM feats;
        `,
        params
      );
      res.json(rows[0]?.geojson ?? { type: 'FeatureCollection', features: [] });
    } catch (err) { next(err); }
  };
}

function makeGetPlotById(table) {
  return async (req, res, next) => {
    const idNum = Number(req.params.id);
    if (!Number.isFinite(idNum)) return res.status(400).json({ ok: false, error: 'Invalid plot id' });
    try {
      const { rows } = await pool.query(
        `
        SELECT json_build_object(
          'type','Feature','id', id,
          'geometry', ST_AsGeoJSON(COALESCE(coordinates))::json,
          'properties', json_build_object(
            'id', id,'uid', uid,'plot_name', plot_name,'plot_type', plot_type,
            'size_sqm', size_sqm,'status', status,'created_at', created_at,'updated_at', updated_at
          )
        ) AS feature
        FROM ${table}
        WHERE id = $1
        `,
        [idNum]
      );
      if (!rows.length || !rows[0].feature) return res.status(404).json({ ok: false, error: 'Plot not found' });
      res.json(rows[0].feature);
    } catch (err) { next(err); }
  };
}

/* ---------- concrete handlers for road/building ---------- */
const getRoadPlotsGeoJSON      = makeGetPlotsGeoJSON('road_plots');
const getRoadPlotById          = makeGetPlotById('road_plots');
const getBuildingPlotsGeoJSON  = makeGetPlotsGeoJSON('building_plots');
const getBuildingPlotById      = makeGetPlotById('building_plots');

/* ---------- export everything consistently ---------- */
module.exports = {
  getPlotsGeoJSON,
  getPlotById,
  getRoadPlotsGeoJSON,
  getRoadPlotById,
  getBuildingPlotsGeoJSON,
  getBuildingPlotById,
};
