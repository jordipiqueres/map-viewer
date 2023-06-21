SELECT st_union(geom)
FROM find_route_linestring(-3.7024250224313806,
						   40.42183458943194,
						   -3.6951714031865635,
						   40.422353760817685)


select ST_SetSRID(ST_Point(-3.6951714031865635,
						   40.422353760817685), 4326) AS click
						   
select * from find_nearest_node_id((select ST_SetSRID(ST_Point(-3.6851714031865635,
						   41.421353760817685), 4326)))
						   
						   
						   SELECT node.id
    FROM ways_vertices_pgr node
    JOIN ways edg
      ON(node.id = edg.source OR    -- Only return node that is
         node.id = edg.target)      --   an edge source or target.
   WHERE edg.source!=edg.target     -- Drop circular edges.
   ORDER BY node.the_geom <->  (select ST_SetSRID(ST_Point(-3.6851714031865635,
						   40.423353760817685), 4326))    -- Find nearest node.
   LIMIT 1;
   
   
   SELECT dijk.path_seq, dijk.edge,
           dijk.cost, dijk.agg_cost, ways.the_geom AS geom
    FROM ways
    JOIN pgr_dijkstra(
        'SELECT gid as id, source, target, length_m as cost, length_m as reverse_cost FROM ways',
        -- source
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.69251714031865635,
						   40.415353760817685), 4326))),
        -- target
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.6851714031865635,
						   40.4214353760817685), 4326)))
        ) AS dijk
        ON ways.gid = dijk.edge;

SELECT *
    from pgr_dijkstra(
        'SELECT gid as id, source, target, length_m as cost, length_m as reverse_cost FROM ways',
        -- source
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.69251714031865635,
						   40.415353760817685), 4326))),
        -- target
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.6851714031865635,
						   40.4214353760817685), 4326)))
        ) AS dijk

SELECT *
    from pgr_dijkstra(
        'SELECT gid as id, source, target, length_m as cost, length_m as reverse_cost FROM ways WHERE  ST_Contains(
    ST_MakeEnvelope (
        -3.69251714031865635 - 0.05,
		40.415353760817685 - 0.05, -- bounding 
        -3.6851714031865635 + 0.05,
		40.4214353760817685 + 0.05, -- box limits
        4326),the_geom)',
        -- source
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.69251714031865635,
						   40.415353760817685), 4326))),
        -- target
        find_nearest_node_id((select ST_SetSRID(ST_Point(-3.6851714031865635,
						   40.4214353760817685), 4326)))
        ) AS dijk
		
		SELECT gid as id, source, target, length_m as cost, length_m as reverse_cost FROM ways
		WHERE  ST_Contains(
    ST_MakeEnvelope (
        -3.69251714031865635 - 0.05,
		40.415353760817685 - 0.05, -- bounding 
        -3.6851714031865635 + 0.05,
		40.4214353760817685 + 0.05, -- box limits
        4326),the_geom)
   
   
   UPDATE ways SET the_geom = ST_Force2D(the_geom);
VACUUM FULL ANALYZE ways;



SELECT * from generate_isochrone(-3.693330071496634, 40.41672130090552);

SELECT * from generate_simple_isochrone(-3.693330071496634, 40.41672130090552, 300);
SELECT 1 as path_seq, 60 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(-3.693330071496634, 40.41672130090552, 60)), 0.99)

DROP FUNCTION generate_simple_isochrone;
CREATE OR REPLACE
FUNCTION generate_simple_isochrone(
    lon FLOAT8 DEFAULT -71.07246980438231,
    lat FLOAT8 DEFAULT 42.3439930733156,
	distance integer DEFAULT 100)
RETURNS
  TABLE(path_seq integer,
        cost integer,
        geom geometry)
AS $$
    BEGIN
    RETURN QUERY
   SELECT 1 as path_seq, distance as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, distance)), 1) as geom;
    END;
$$ LANGUAGE 'plpgsql'
STABLE
STRICT
PARALLEL SAFE;


select ST_Buffer(ST_Envelope(ST_MakeLine((select ST_SetSRID(ST_Point(-3.692517140,
						   40.415353760), 4326)),
					  (select ST_SetSRID(ST_Point(-3.685171403,
						   40.4214353760), 4326)))), 0.001)
union
select ST_Envelope(ST_MakeLine((select ST_SetSRID(ST_Point(-3.692517140,
						   40.415353760), 4326)),
					  (select ST_SetSRID(ST_Point(-3.685171403,
						   40.4214353760), 4326))))




DROP FUNCTION generate_isochrone;
CREATE OR REPLACE
FUNCTION generate_isochrone(
    lon FLOAT8 DEFAULT -71.07246980438231,
    lat FLOAT8 DEFAULT 42.3439930733156,
	distance FLOAT8 DEFAULT 100)
RETURNS
  TABLE(path_seq integer,
        cost integer,
        geom geometry)
AS $$
    BEGIN
    RETURN QUERY
   SELECT 1 as path_seq, 60 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, 60)), 1) as geom
union
SELECT 2 as path_seq, 120 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, 120)), 1) as geom
union
SELECT 3 as path_seq, 300 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, 300)), 1) as geom
union
SELECT 4 as path_seq, 600 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, 600)), 1) as geom
union
SELECT 5 as path_seq, 900 as cost, st_concavehull((select ST_Collect(find_isochrone_points.geom) as geom
from find_isochrone_points(lon, lat, 900)), 1) as geom;
    END;
$$ LANGUAGE 'plpgsql'
STABLE
STRICT
PARALLEL SAFE;
