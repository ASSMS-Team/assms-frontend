"""Generate private local-only configuration; never overwrite an existing test database identity."""
from pathlib import Path
import secrets, string

root=Path(__file__).resolve().parent/'local'
root.mkdir(parents=True,exist_ok=True)
path=root/'.env'
keys=['CUSTOMER_DB_PASSWORD','JOB_DB_PASSWORD','DISPATCH_DB_PASSWORD','REPORTING_DB_PASSWORD','JWT_SIGNING_KEY','INTERNAL_SERVICE_KEY','MANAGER_PASSWORD','DISPATCHER_PASSWORD','AGENT_PASSWORD','TECHNICIAN_SEED_PASSWORD','MYSQL_ROOT_PASSWORD','TECHNICIAN_A_PASSWORD','TECHNICIAN_B_PASSWORD']
if not path.exists():
    values={key:''.join(secrets.choice(string.ascii_letters+string.digits) for _ in range(48 if 'KEY' in key else 32)) for key in keys}
    with path.open('x',encoding='utf-8') as stream:
        stream.write('\n'.join(k+'='+v for k,v in values.items())+'\n')
    print('Created ignored local/.env. Keep it private and preserve it when restarting your database.')
else:
    values=dict(line.split('=',1) for line in path.read_text(encoding='utf-8').splitlines() if line and not line.startswith('#'))
    if any(not values.get(key) for key in keys): raise SystemExit('Existing local/.env has missing values. Complete it without replacing active DB credentials.')
    print('Using existing private local configuration.')
(root/'jmeter.properties').write_text('manager_user=manager.local\nmanager_password='+values['MANAGER_PASSWORD']+'\n',encoding='utf-8')
