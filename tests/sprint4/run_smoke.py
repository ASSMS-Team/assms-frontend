"""Sprint 4 smoke probes based on Sprint 2: current endpoints, honest exit status, JSON evidence."""
import socket, sys
from support import Run, require, FRONTEND

def main():
    run=Run('smoke')
    def frontend():
        r=run.session.get(FRONTEND+'/login',timeout=20)
        assert r.status_code==200 and 'id="root"' in r.text
        return 'Frontend login route HTTP 200 with SPA root'
    run.case('S4-SMOKE-01','Frontend login route',frontend)
    for index,service in enumerate(['customer','job','dispatch','reporting'],2):
        def health(service=service):
            health=require(run.call(service,'/api/health'))
            db=require(run.call(service,'/api/health/db'))
            assert health['status']=='Healthy' and db['status']=='Healthy'
            return {'liveness':health,'database':db}
        run.case(f'S4-SMOKE-{index:02d}',service+' liveness and DB connectivity',health)
    for index,role in enumerate(['Manager','Agent','Dispatcher'],6):
        run.case(f'S4-SMOKE-{index:02d}',role+' login and role',lambda role=role:run.login(role)['staff'])
    def anonymous():
        r=run.call('dispatch','/api/technicians')
        assert r.status_code==401,f'Expected 401, got {r.status_code}'
        return 'Unauthenticated protected Dispatch endpoint returns 401'
    run.case('S4-SMOKE-09','Protected API denies anonymous access',anonymous)
    def manager_report():
        token=run.login('Manager')['accessToken']
        return require(run.call('reporting','/api/reports/jobs-by-status',token=token))
    run.case('S4-SMOKE-10','Manager can read reporting projection API',manager_report)
    def broker():
        with socket.create_connection(('127.0.0.1',19092),timeout=5): pass
        return 'TCP broker port reachable; real topics/groups are verified separately'
    run.case('S4-SMOKE-11','Kafka external listener reachable',broker)
    print('Evidence:',run.folder)
    return 1 if any(r['status']=='Fail' for r in run.results) else 0

if __name__=='__main__': sys.exit(main())
