"""Validar SQL/PLpgSQL con pglast y comprobar referencias del esquema.

No sustituye ejecutar tests/integrity.sql en PostgreSQL con PostGIS.
"""
from pathlib import Path
import re
import sys

try:
    from pglast import parse_sql, parser, ast, enums
except ImportError:
    sys.exit('Se necesita pglast; esta comprobación no instala dependencias automáticamente.')

ROOT = Path(__file__).resolve().parents[1]
migrations = sorted((ROOT/'migrations').glob('*.sql'))
# The atomic installer is the original 001–005 baseline. Later migrations are
# deliberately incremental and must not be concatenated into that baseline.
initial_migrations = [p for p in migrations if p.name[:3] in {'001', '002', '003', '004', '005'}]
files = migrations + [ROOT/'tests/integrity.sql']
if (ROOT/'observatorio_puebla.sql').exists():
    files.append(ROOT/'observatorio_puebla.sql')

for path in files:
    sql = path.read_text()
    statements = parse_sql(sql)
    bodies = 0
    for match in re.finditer(r'CREATE FUNCTION\s+(\w+).*?\$\$;', sql, re.S):
        if 'LANGUAGE plpgsql' in match[0]:
            parser.parse_plpgsql_json(match[0])
            bodies += 1
    for match in re.finditer(r'DO (\$\w+\$)(.*?)\1;', sql, re.S):
        parser.parse_plpgsql_json('CREATE FUNCTION bloque_validacion() RETURNS void LANGUAGE plpgsql AS $$'+match[2]+'$$;')
        bodies += 1
    print(f'{path.name}: {len(statements)} sentencias, {bodies} cuerpos PL/pgSQL válidos')

tables = {}
references = []
for path in migrations:
    for raw in parse_sql(path.read_text()):
        node = raw.stmt
        if not isinstance(node, ast.CreateStmt):
            continue
        name = node.relation.relname
        assert name not in tables, f'Tabla duplicada: {name}'
        columns, unique_sets = set(), []
        constraints = []
        for elt in node.tableElts or ():
            if isinstance(elt, ast.ColumnDef):
                assert elt.colname not in columns, (name, elt.colname)
                columns.add(elt.colname)
                for con in elt.constraints or ():
                    if con.contype in (enums.ConstrType.CONSTR_PRIMARY, enums.ConstrType.CONSTR_UNIQUE):
                        unique_sets.append((elt.colname,))
                    constraints.append((con, elt.colname))
            elif isinstance(elt, ast.Constraint):
                if elt.contype in (enums.ConstrType.CONSTR_PRIMARY, enums.ConstrType.CONSTR_UNIQUE):
                    unique_sets.append(tuple(k.sval for k in elt.keys))
                constraints.append((elt, None))
        tables[name] = (columns, unique_sets)
        for con, inline in constraints:
            if con.contype == enums.ConstrType.CONSTR_FOREIGN:
                own = tuple(k.sval for k in con.fk_attrs) if con.fk_attrs else (inline,)
                target = tuple(k.sval for k in con.pk_attrs) if con.pk_attrs else None
                references.append((name, own, con.pktable.relname, target))

for table, own, target, target_columns in references:
    assert target in tables, f'{table}: tabla referenciada inexistente {target}'
    assert set(own) <= tables[table][0], (table, own)
    if target_columns:
        assert set(target_columns) <= tables[target][0], (table, target, target_columns)
        assert target_columns in tables[target][1], f'{table}: FK sin clave única en {target}{target_columns}'
    else:
        assert tables[target][1], f'{target}: falta clave de referencia'
print(f'{len(tables)} tablas y {len(references)} referencias estructurales verificadas.')

bundle = ROOT/'observatorio_puebla.sql'
if bundle.exists():
    expected = '\n\n'.join(
        f'-- ===== {p.name} =====\n'+re.sub(r'^BEGIN;\s*|^COMMIT;\s*', '', p.read_text(), flags=re.M).strip()
        for p in initial_migrations
    )
    actual = bundle.read_text()
    assert expected in actual, 'El instalador único no coincide con las migraciones.'
    assert len(re.findall(r'^BEGIN;', actual, re.M)) == 1
    assert len(re.findall(r'^COMMIT;', actual, re.M)) == 1
    print('Instalador único sincronizado y con una sola transacción.')
