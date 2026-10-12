"""Portable result/evidence handling adapted from the Sprint 2 runner structure."""
from pathlib import Path
from datetime import datetime, timezone, timedelta
import html, json, os, time
import requests

HERE=Path(__file__).resolve().parent
ZONE=timezone(timedelta(hours=5,minutes=30))
URLS={n:os.getenv(n.upper()+'_API_URL',f'http://localhost:{port}') for n,port in [('customer',5037),('job',5252),('dispatch',5055),('reporting',8082)]}
FRONTEND=os.getenv('FRONTEND_URL','http://localhost:8081')
def local_config():
    path=HERE/'local/.env'
    if not path.exists(): raise RuntimeError('Run setup_local_config.py before QA execution.')
    return dict(line.split('=',1) for line in path.read_text(encoding='utf-8').splitlines() if line and not line.startswith('#'))

CONFIG=local_config()
ACCOUNTS={'Manager':('manager.local',CONFIG['MANAGER_PASSWORD']), 'Dispatcher':('dispatcher.local',CONFIG['DISPATCHER_PASSWORD']), 'Agent':('agent.local',CONFIG['AGENT_PASSWORD']), 'Technician A':('qa.tech.a',CONFIG['TECHNICIAN_A_PASSWORD']), 'Technician B':('qa.tech.b',CONFIG['TECHNICIAN_B_PASSWORD'])}

def redact(value):
    if isinstance(value,dict):
        return {k:('[REDACTED]' if any(word in k.lower() for word in ['password','token','secret','authorization','cookie']) else redact(v)) for k,v in value.items()}
    if isinstance(value,list): return [redact(v) for v in value]
    return value

class Run:
    def __init__(self,suite):
        self.suite=suite
        self.id=os.getenv('QA_RUN_ID',datetime.now(ZONE).strftime('%Y%m%dT%H%M%S')+'-'+suite)
        self.folder=HERE/'artifacts'/self.id
        self.folder.mkdir(parents=True,exist_ok=True)
        self.session=requests.Session(); self.session.trust_env=False
        self.results=[]; self.sequence=0
        revisions=json.loads((HERE/'local/SOURCE_REVISIONS.json').read_text())
        self.save('manifest.json',{'runId':self.id,'suite':suite,'startedAt':datetime.now(ZONE).isoformat(),'builds':revisions,'urls':URLS,'frontend':FRONTEND,'environment':'local','mocked':False})

    def save(self,name,data):
        dest=self.folder/name; dest.parent.mkdir(parents=True,exist_ok=True)
        dest.write_text(json.dumps(redact(data),indent=2),encoding='utf-8')

    def call(self,service,path,method='GET',body=None,token=None):
        headers={'Authorization':'Bearer '+token} if token else {}
        response=self.session.request(method,URLS[service]+path,json=body,headers=headers,timeout=20)
        self.sequence+=1
        try: payload=response.json()
        except ValueError: payload={'text':response.text[:2000]}
        self.save(f'api/{self.sequence:04d}.json',{'method':method,'url':response.url,'request':body,'authenticated':bool(token),'status':response.status_code,'response':payload})
        return response

    def login(self,role):
        username,password=ACCOUNTS[role]
        username=os.getenv(role.upper().replace(' ','_')+'_USER',username)
        password=os.getenv(role.upper().replace(' ','_')+'_PASSWORD',password)
        r=self.call('customer','/api/auth/login','POST',{'identifier':username,'password':password})
        assert r.status_code==200,f'{role} login returned {r.status_code}'
        data=r.json(); assert data['staff']['role']==role.split(' ')[0]
        return data

    def case(self,id,title,function):
        start=time.monotonic()
        result={'id':id,'title':title,'status':'Pass','timestamp':datetime.now(ZONE).isoformat()}
        try:
            detail=function()
            if detail is not None: result['actual']=redact(detail)
        except Exception as error:
            result.update(status='Fail',actual=str(error))
        result['durationSeconds']=round(time.monotonic()-start,3)
        self.results.append(result)
        print(f"{id}: {result['status']} - {title}",flush=True)
        self.finish()

    def finish(self):
        self.save('results.json',self.results)
        rows=''.join('<tr>'+''.join('<td>'+html.escape(str(r.get(k,'')))+'</td>' for k in ['id','title','status','actual','durationSeconds'])+'</tr>' for r in self.results)
        (self.folder/'report.html').write_text('<!doctype html><meta charset="utf-8"><title>Sprint 4 QA results</title><style>body{font:16px Arial;margin:30px}td,th{border:1px solid #ccc;padding:8px}table{border-collapse:collapse}</style><h1>ASSMS Sprint 4 '+html.escape(self.suite)+'</h1><p>Actual execution: '+html.escape(self.id)+'</p><table><tr><th>ID</th><th>Check</th><th>Result</th><th>Actual</th><th>Seconds</th></tr>'+rows+'</table>',encoding='utf-8')

def require(response,status=200):
    assert response.status_code==status,f'Expected HTTP {status}, got {response.status_code}'
    return response.json() if response.content else None

def poll(function,predicate,timeout=90):
    deadline=time.monotonic()+timeout
    last=None
    while time.monotonic()<deadline:
        last=function()
        if predicate(last): return last
        time.sleep(1)
    raise AssertionError(f'Eventual state did not converge within {timeout}s; last={redact(last)}')
