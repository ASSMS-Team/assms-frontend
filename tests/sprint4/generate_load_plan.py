"""Create a portable health/login/read-only JMeter baseline from the Sprint 2 plan structure."""
from pathlib import Path
import xml.etree.ElementTree as E

def string(parent,name,value): return E.SubElement(parent,'stringProp',name=name).__setattr__('text',value)
def boolean(parent,name,value): E.SubElement(parent,'boolProp',name=name).text='true' if value else 'false'
def element(parent,tag,gui,testclass,name): return E.SubElement(parent,tag,guiclass=gui,testclass=testclass,testname=name,enabled='true')

root=E.Element('jmeterTestPlan',version='1.2',properties='5.0',jmeter='5.6.3')
tree=E.SubElement(root,'hashTree')
plan=element(tree,'TestPlan','TestPlanGui','TestPlan','ASSMS Sprint 4 local baseline')
string(plan,'TestPlan.comments','Health, login and protected reporting reads only. Performance targets require team agreement. No listener stores credentials or response bodies.')
args=E.SubElement(plan,'elementProp',name='TestPlan.user_defined_variables',elementType='Arguments',guiclass='ArgumentsPanel',testclass='Arguments',testname='Variables',enabled='true'); E.SubElement(args,'collectionProp',name='Arguments.arguments')
pt=E.SubElement(tree,'hashTree')
group=element(pt,'ThreadGroup','ThreadGroupGui','ThreadGroup','Local read-only workload')
string(group,'ThreadGroup.on_sample_error','continue')
controller=E.SubElement(group,'elementProp',name='ThreadGroup.main_controller',elementType='LoopController',guiclass='LoopControlPanel',testclass='LoopController',testname='Loop Controller',enabled='true')
boolean(controller,'LoopController.continue_forever',False); string(controller,'LoopController.loops','-1')
string(group,'ThreadGroup.num_threads','${__P(users,1)}');string(group,'ThreadGroup.ramp_time','${__P(ramp,10)}');boolean(group,'ThreadGroup.scheduler',True);string(group,'ThreadGroup.duration','${__P(duration,60)}'); string(group,'ThreadGroup.delay','0')
gt=E.SubElement(pt,'hashTree')

def sampler(name,port,path,method='GET',body=None):
    s=element(gt,'HTTPSamplerProxy','HttpTestSampleGui','HTTPSamplerProxy',name)
    a=E.SubElement(s,'elementProp',name='HTTPsampler.Arguments',elementType='Arguments'); c=E.SubElement(a,'collectionProp',name='Arguments.arguments')
    if body:
        arg=E.SubElement(c,'elementProp',name='',elementType='HTTPArgument');boolean(arg,'HTTPArgument.always_encode',False);string(arg,'Argument.value',body);string(arg,'Argument.metadata','=');boolean(s,'HTTPSampler.postBodyRaw',True)
    string(s,'HTTPSampler.domain','${__P(host,localhost)}');string(s,'HTTPSampler.port',str(port));string(s,'HTTPSampler.protocol','http');string(s,'HTTPSampler.path',path);string(s,'HTTPSampler.method',method);boolean(s,'HTTPSampler.follow_redirects',False);boolean(s,'HTTPSampler.use_keepalive',True); string(s,'HTTPSampler.connect_timeout','10000');string(s,'HTTPSampler.response_timeout','20000')
    st=E.SubElement(gt,'hashTree')
    assertion=element(st,'ResponseAssertion','AssertionGui','ResponseAssertion','HTTP 200 assertion'); collection=E.SubElement(assertion,'collectionProp',name='Asserion.test_strings');E.SubElement(collection,'stringProp',name='200').text='200';string(assertion,'Assertion.test_field','Assertion.response_code');E.SubElement(assertion,'intProp',name='Assertion.test_type').text='8'; E.SubElement(st,'hashTree')
    return st

for n,p in [('Customer',5037),('Job',5252),('Dispatch',5055),('Reporting',8082)]: sampler(n+' health',p,'/api/health')
login=sampler('Manager login',5037,'/api/auth/login','POST','{"identifier":"${__P(manager_user,manager.local)}","password":"${__P(manager_password,)}"}')
headers=element(login,'HeaderManager','HeaderPanel','HeaderManager','JSON content type'); coll=E.SubElement(headers,'collectionProp',name='HeaderManager.headers');head=E.SubElement(coll,'elementProp',name='',elementType='Header');string(head,'Header.name','Content-Type');string(head,'Header.value','application/json');E.SubElement(login,'hashTree')
extractor=element(login,'JSONPostProcessor','JSONPostProcessorGui','JSONPostProcessor','Extract JWT in memory');string(extractor,'JSONPostProcessor.referenceNames','staff_jwt');string(extractor,'JSONPostProcessor.jsonPathExprs','$.accessToken');string(extractor,'JSONPostProcessor.match_numbers','1');string(extractor,'JSONPostProcessor.defaultValues','MISSING_TOKEN');E.SubElement(login,'hashTree')
report=sampler('Manager jobs-by-status report',8082,'/api/reports/jobs-by-status')
headers=element(report,'HeaderManager','HeaderPanel','HeaderManager','Bearer token'); coll=E.SubElement(headers,'collectionProp',name='HeaderManager.headers');head=E.SubElement(coll,'elementProp',name='',elementType='Header');string(head,'Header.name','Authorization');string(head,'Header.value','Bearer ${staff_jwt}');E.SubElement(report,'hashTree')
timer=element(gt,'ConstantTimer','ConstantTimerGui','ConstantTimer','One second think time');string(timer,'ConstantTimer.delay','1000');E.SubElement(gt,'hashTree')
E.indent(root,space='  ')
target=Path(__file__).with_name('assms_sprint4_baseline.jmx')
E.ElementTree(root).write(target,encoding='utf-8',xml_declaration=True)
print(target)
