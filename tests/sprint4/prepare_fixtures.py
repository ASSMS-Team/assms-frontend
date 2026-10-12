"""Prepare synthetic local data via public service APIs, never direct cross-service SQL writes."""
import json, sys, time
from support import Run, require, poll, HERE, ACCOUNTS

def main():
    run=Run('fixtures')
    fixtures={}; tokens={}
    def prepare():
        for role in ['Manager','Agent','Dispatcher']:
            login=run.login(role); tokens[role]=login['accessToken']; fixtures[role]={'username':login['staff']['username'],'staffId':login['staff']['id']}
        technicians=require(run.call('dispatch','/api/technicians',token=tokens['Dispatcher']))
        for letter,region in [('A','WESTERN'),('B','CENTRAL')]:
            role='Technician '+letter; reference='QA-S4-TECH-'+letter
            technician=next((t for t in technicians if t['reference'].upper()==reference),None)
            if technician is None:
                technician=require(run.call('dispatch','/api/technicians','POST',{'reference':reference,'fullName':'QA Sprint 4 Technician '+letter,'region':region,'skills':['AC'],'status':'ACTIVE'},token=tokens['Dispatcher']),201)
            id=technician['id']
            existing=run.call('customer','/api/auth/technician-accounts/'+id,token=tokens['Dispatcher'])
            if existing.status_code==404:
                username,password=ACCOUNTS[role]
                require(run.call('customer','/api/auth/technician-accounts/'+id,'POST',{'username':username,'email':username+'@assms.test','password':password},token=tokens['Dispatcher']),201)
            else: require(existing)
            login=run.login(role); tokens[role]=login['accessToken']
            assert login['staff']['technicianId']==id and login['staff']['id']!=id
            fixtures[role]={'username':login['staff']['username'],'staffId':login['staff']['id'],'technicianId':id,'reference':reference,'region':region}
        tag=str(time.time_ns())[-10:]
        customer=require(run.call('customer','/api/customers','POST',{'name':'QA Sprint 4 '+tag,'phone':'077'+tag[-7:],'address':'Synthetic QA address, Western province','customerType':'INDIVIDUAL','email':'qa.'+tag+'@assms.test'},token=tokens['Agent']),201)
        asset=require(run.call('customer','/api/assets','POST',{'customerId':customer['id'],'assetType':'AIR_CONDITIONER','model':'QA-AC','serialNumber':'QA-S4-'+tag,'installationDate':'2026-10-01','location':'QA test room'},token=tokens['Agent']),201)
        job=require(run.call('job','/api/jobs','POST',{'customerId':customer['id'],'assetId':asset['id'],'serviceCategory':'REPAIR','problemDescription':'Synthetic QA Sprint 4 cooling fault '+tag,'priority':'HIGH','region':'WESTERN'},token=tokens['Agent']),201)
        jobid=job['id']
        assignments=poll(lambda:require(run.call('dispatch','/api/my-assignments',token=tokens['Technician A'])),lambda rows:any(r['jobId']==jobid for r in rows),timeout=120)
        # Dispatch's list may be ready before Job Service consumes JobAssigned.
        poll(lambda:require(run.call('job','/api/jobs/'+jobid,token=tokens['Manager'])),lambda value:value.get('assignment',{}).get('technicianId')==fixtures['Technician A']['technicianId'] if value.get('assignment') else False,timeout=120)
        own=require(run.call('job','/api/jobs/'+jobid,token=tokens['Technician A']))
        fixtures.update({'customerId':customer['id'],'assetId':asset['id'],'jobId':jobid,'jobReference':job['jobReference'],'assignment':next(r for r in assignments if r['jobId']==jobid)})
        run.save('fixtures.json',fixtures)
        (HERE/'artifacts/fixtures.json').write_text(json.dumps(fixtures,indent=2),encoding='utf-8')
        return fixtures
    run.case('S4-FIXTURES-01','Prepare role accounts, immutable links and assigned demo job',prepare)
    print('Evidence:',run.folder)
    return 1 if any(r['status']=='Fail' for r in run.results) else 0

if __name__=='__main__': sys.exit(main())
