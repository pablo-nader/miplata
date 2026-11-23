UPDATE "institution" AS i
SET "logo_path" = v."logo_path"
FROM (VALUES
	('Banco Nación', '/institutions/banco-nacion.svg'),
	('Galicia', '/institutions/galicia.svg'),
	('Santander', '/institutions/santander.svg'),
	('BBVA', '/institutions/bbva.svg'),
	('Macro', '/institutions/macro.svg'),
	('Banco Ciudad', '/institutions/banco-ciudad.svg'),
	('Credicoop', '/institutions/credicoop.svg'),
	('Patagonia', '/institutions/patagonia.svg'),
	('Supervielle', '/institutions/supervielle.svg'),
	('Mercado Pago', '/institutions/mercado-pago.svg'),
	('Ualá', '/institutions/uala.svg'),
	('Naranja X', '/institutions/naranja-x.svg')
) AS v("name", "logo_path")
WHERE i."name" = v."name" AND i."logo_path" IS DISTINCT FROM v."logo_path";
