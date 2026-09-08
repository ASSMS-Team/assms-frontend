const pages = [...document.querySelectorAll('[data-page]')]
const links = [...document.querySelectorAll('[data-route]')]
const sidebar = document.querySelector('.sidebar')

function showPage(name) {
  const target = pages.find((page) => page.dataset.page === name) || pages[0]
  pages.forEach((page) => page.classList.toggle('active', page === target))
  links.forEach((link) => link.classList.toggle('active', link.dataset.route === name))
  sidebar.classList.remove('open')
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function routeFromHash() {
  showPage(location.hash.slice(1) || 'technicians')
}

links.forEach((link) => link.addEventListener('click', () => showPage(link.dataset.route)))
document.querySelectorAll('[data-open]').forEach((button) => button.addEventListener('click', () => {
  const name = button.dataset.open
  history.pushState(null, '', `#${name}`)
  showPage(name)
}))
document.querySelectorAll('[data-back]').forEach((button) => button.addEventListener('click', () => {
  const name = button.dataset.back
  history.pushState(null, '', `#${name}`)
  showPage(name)
}))
window.addEventListener('hashchange', routeFromHash)
document.querySelector('.menu-button').addEventListener('click', () => sidebar.classList.toggle('open'))

const technicianForm = document.querySelector('#technician-form')
technicianForm.addEventListener('submit', (event) => {
  event.preventDefault()
  const data = new FormData(technicianForm)
  const requiredNames = ['reference', 'name', 'region']
  requiredNames.forEach((name) => {
    const input = technicianForm.elements[name]
    input.closest('.field').classList.toggle('invalid', !String(data.get(name) || '').trim())
  })
  const skillField = technicianForm.querySelector('.skill-field')
  skillField.classList.toggle('invalid', data.getAll('skills').length === 0)
  if (!technicianForm.querySelector('.invalid')) {
    history.pushState(null, '', '#technician-detail')
    showPage('technician-detail')
  }
})
technicianForm.addEventListener('input', (event) => event.target.closest('.field')?.classList.remove('invalid'))

const search = document.querySelector('#technician-search')
const region = document.querySelector('#technician-region')
const status = document.querySelector('#technician-status')
function filterTechnicians() {
  let visible = 0
  document.querySelectorAll('#technician-rows tr').forEach((row) => {
    const matchesSearch = row.dataset.name.includes(search.value.toLowerCase())
    const matchesRegion = region.value === 'all' || row.dataset.region === region.value
    const matchesStatus = status.value === 'all' || row.dataset.status === status.value
    row.hidden = !(matchesSearch && matchesRegion && matchesStatus)
    if (!row.hidden) visible += 1
  })
  document.querySelector('#technician-empty').hidden = visible !== 0
}
search.addEventListener('input', filterTechnicians)
region.addEventListener('change', filterTechnicians)
status.addEventListener('change', filterTechnicians)

document.querySelector('[data-deactivate]').addEventListener('click', () => { document.querySelector('#deactivate-toast').hidden = false })
document.querySelector('[data-close-toast]').addEventListener('click', () => { document.querySelector('#deactivate-toast').hidden = true })
document.querySelector('[data-demo-state]').addEventListener('click', () => { document.querySelector('#state-review').hidden = false })
document.querySelector('[data-close-state]').addEventListener('click', () => { document.querySelector('#state-review').hidden = true })
document.querySelector('#state-review').addEventListener('click', (event) => {
  if (event.target.id === 'state-review') event.currentTarget.hidden = true
})
document.querySelector('#report-filters').addEventListener('submit', (event) => event.preventDefault())

routeFromHash()

// Review controls operate on local sample records only.
document.querySelector('.search-button').outerHTML = '<div class="workspace-label">SERVICE OPERATIONS <span>/</span> SPRINT 02</div>'
document.querySelector('.topbar-actions button').remove()
document.querySelector('.sidebar-footer button').remove()
document.querySelector('.environment').innerHTML = '<span></span> Design preview'
document.querySelector('.sidebar-footer strong').textContent = 'Demo workspace'
document.querySelector('.metrics').innerHTML = '<article><span>Team directory</span><strong>04</strong><small>Technicians in this demonstration</small></article><article><span>Active technicians</span><strong>03</strong><small>Eligibility depends on skill and region</small></article><article><span>Open assignments</span><strong>12</strong><small>Completed and cancelled excluded</small></article><article><span>Review stage</span><strong>02</strong><small>Sprint · BA and QA approval pending</small></article>'
document.querySelector('.pagination').innerHTML = '<span>All 4 sample records</span><span>SELECT A TECHNICIAN TO EXPLORE ↗</span>'
document.querySelector('.result-count').textContent = '4 technicians'
document.querySelector('.job-toolbar .search-field').remove()
document.querySelector('#job-technician option[value="unassigned"]').remove()
const jobRows = [...document.querySelectorAll('[data-page="jobs"] tbody tr')]
jobRows[1].querySelector('.status').textContent = 'Created'
function applyJobFilters() {
  let count = 0
  jobRows.forEach(row => {
    row.hidden = !((document.querySelector('#job-status').value === 'all' || row.querySelector('.status').textContent === document.querySelector('#job-status').value) && (document.querySelector('#job-technician').value === 'all' || row.textContent.includes(document.querySelector('#job-technician').value)))
    if (!row.hidden) count++
  })
  document.querySelector('.filter-summary span').textContent = count ? `${count} matching jobs · filters combined with AND` : 'No jobs match. Clear filters to see all jobs.'
}
document.querySelector('.job-toolbar .button').onclick = applyJobFilters
document.querySelector('.filter-summary button').onclick = () => { document.querySelector('#job-status').value = 'all'; document.querySelector('#job-technician').value = 'all'; applyJobFilters() }
document.querySelector('[data-page="jobs"] .page-heading button').remove()
document.querySelector('.assignment-strip p').textContent = 'Sample workflow · review the assignment scenarios'
const scenario = document.createElement('div')
scenario.className = 'scenario-switch'
scenario.innerHTML = '<label>Review scenario <select id="scenario"><option>Assigned</option><option>Processing</option><option>No eligible technician</option><option>Synchronization pending</option></select></label><p id="scenario-message" role="status"></p>'
document.querySelector('[data-page="assignment-feedback"] .page-heading').after(scenario)
document.querySelector('#scenario').onchange = event => {
  const value = event.target.value
  document.querySelector('.assignment-success').hidden = value !== 'Assigned'
  document.querySelector('.assignment-layout').hidden = value !== 'Assigned'
  document.querySelector('#assignment-title').textContent = value === 'Assigned' ? 'JOB-1054 assigned' : value
  document.querySelector('.large-status').textContent = value
  document.querySelector('#scenario-message').textContent = ({Assigned:'Assignment recorded once. Repeated events do not create another assignment.',Processing:'Waiting for automatic evaluation. A technician has not been confirmed.','No eligible technician':'No active technician matches both skill and region. Dispatcher attention is required.','Synchronization pending':'The assignment is saved. Updates to other screens are pending; do not create another assignment.'})[value]
}
const reportForm = document.querySelector('#report-filters')
const reportData = [{name:'Nimal Perera',ref:'TEC-014',region:'Colombo',time:'2026-09-02T08:00:00Z',count:2},{name:'Dilani Fernando',ref:'TEC-022',region:'Gampaha',time:'2026-09-03T08:00:00Z',count:4},{name:'Amaya Silva',ref:'TEC-031',region:'Colombo',time:'2026-09-04T08:00:00Z',count:6}]
let filteredReport = []
document.querySelector('.insight-panel').innerHTML = '<div class="panel-title"><h2>Reading this report</h2></div><p class="review-copy">Counts describe assignments within the selected period. They are not current open-job workload.<br><br>From is inclusive. To is exclusive. All times are UTC. Region combines with dates using AND.</p>'
document.querySelector('.freshness').textContent = 'Sample data'
document.querySelector('.report-summary').innerHTML = '<article><span>Assignments in period</span><strong id="report-total"></strong><small>Filtered assignment count</small></article><article><span>Technicians represented</span><strong id="report-people"></strong><small>With matching assignments</small></article>'
const reportMessage = document.createElement('p'); reportMessage.className = 'report-message'; reportMessage.setAttribute('role','status'); reportForm.after(reportMessage)
function runReport() {
  const from = reportForm.elements.from.value, to = reportForm.elements.to.value
  const a = from ? Date.parse(from+'Z') : -Infinity, b = to ? Date.parse(to+'Z') : Infinity
  const invalid = a >= b
  reportMessage.textContent = invalid ? 'From must be earlier than To. Correct the range to run the report.' : 'Assignment timestamps · UTC · From inclusive / To exclusive'
  filteredReport = invalid ? [] : reportData.filter(r => Date.parse(r.time) >= a && Date.parse(r.time) < b && (reportForm.elements.region.value === 'All regions' || r.region === reportForm.elements.region.value))
  document.querySelector('#report-total').textContent = invalid ? '—' : filteredReport.reduce((n,r) => n+r.count,0)
  document.querySelector('#report-people').textContent = invalid ? '—' : filteredReport.length
  document.querySelector('.bar-chart').innerHTML = filteredReport.length ? filteredReport.map(r => `<div><label>${r.name}<small>${r.ref}</small></label><span><i style="--value:${r.count/6*100}%"></i></span><strong>${r.count}</strong></div>`).join('') : `<p>${invalid ? 'Correct the date range above.' : 'No assignments match. Try a wider date range or another region.'}</p>`
}
reportForm.onsubmit = event => { event.preventDefault(); runReport() }
reportForm.onreset = event => { event.preventDefault(); reportForm.elements.from.value=''; reportForm.elements.to.value=''; reportForm.elements.region.selectedIndex=0; runReport() }
document.querySelector('[data-page="report"] .page-heading button').onclick = () => {
 const url = URL.createObjectURL(new Blob(['Technician,Reference,Region,Assignments\n'+filteredReport.map(r => `${r.name},${r.ref},${r.region},${r.count}`).join('\n')],{type:'text/csv'}))
 const a=document.createElement('a'); a.href=url; a.download='assms-demo-report.csv'; a.click(); URL.revokeObjectURL(url)
}
document.addEventListener('keydown',event => { if(event.key==='Escape'){document.querySelector('#state-review').hidden=true;sidebar.classList.remove('open')} })
runReport()

let currentRow = document.querySelector('#technician-rows tr')
let editMode = false
function refreshDetail(row) {
 currentRow=row
 document.querySelector('#technician-detail-title').textContent=row.querySelector('.person-link strong').textContent
 document.querySelector('.detail-person .eyebrow').textContent=row.querySelector('.person-link small').textContent
 document.querySelector('.detail-person .avatar').textContent=row.querySelector('.avatar').textContent
 document.querySelector('.detail-person>div>div').textContent=`${row.dataset.status} · ${row.dataset.region}`
 const values=document.querySelectorAll('.definition-grid dd')
 values[0].textContent=row.dataset.region;values[1].textContent=`${row.querySelector('.load').textContent} open jobs`;values[2].textContent='Not provided';values[3].textContent='Not provided';values[4].replaceChildren(...[...row.querySelectorAll('.tag')].map(t=>t.cloneNode(true)))
 const count=Number(row.querySelector('.load').textContent)
 document.querySelector('.count-chip').textContent=`${count} open`
 document.querySelector('.assignment-list').innerHTML=`<article><div><strong>${count} open assignments</strong><p>${count?'Review open jobs before deactivation.':'No open jobs block deactivation.'}</p></div></article>`
 document.querySelector('.activity').innerHTML='<div class="panel-title"><h2>Eligibility</h2></div><p class="review-copy">Only active technicians matching the required skill and region are eligible. Updates apply to future allocation.</p>'
 document.querySelector('[data-deactivate]').disabled=row.dataset.status==='Inactive'
}
document.querySelector('#technician-rows').addEventListener('click',event=>{const row=event.target.closest('tr');if(row){refreshDetail(row);location.hash='technician-detail';showPage('technician-detail')}})
document.querySelector('.detail-actions .button-secondary').onclick=()=>{
 editMode=true;technicianForm.reset();technicianForm.elements.name.value=currentRow.querySelector('strong').textContent;technicianForm.elements.reference.value=currentRow.querySelector('small').textContent;technicianForm.elements.region.value=currentRow.dataset.region;technicianForm.elements.status.value=currentRow.dataset.status
 technicianForm.querySelectorAll('[name="skills"]').forEach(c=>c.checked=[...currentRow.querySelectorAll('.tag')].some(t=>t.textContent===c.value))
 document.querySelector('#technician-form-title').textContent='Edit technician';technicianForm.querySelector('[type="submit"]').textContent='Save changes';location.hash='technician-form';showPage('technician-form')
}
document.querySelector('[data-open="technician-form"]').addEventListener('click',()=>{editMode=false;technicianForm.reset();document.querySelector('#technician-form-title').textContent='Add technician';technicianForm.querySelector('[type="submit"]').textContent='Create technician'})
technicianForm.addEventListener('submit',event=>{
 event.preventDefault();event.stopImmediatePropagation()
 const d=new FormData(technicianForm);let invalid=false
 for(const key of ['name','reference','region']){const input=technicianForm.elements[key];let bad=!String(d.get(key)||'').trim();if(key==='reference'){bad ||= [...document.querySelectorAll('#technician-rows tr')].some(r=>(!editMode||r!==currentRow)&&r.querySelector('small').textContent===d.get(key));input.closest('.field').querySelector('em').textContent='Enter a unique technician reference.'}input.closest('.field').classList.toggle('invalid',bad);input.setAttribute('aria-invalid',String(bad));invalid ||= bad}
 const noSkills=!d.getAll('skills').length;document.querySelector('.skill-field').classList.toggle('invalid',noSkills);if(invalid||noSkills)return
 if(editMode&&Number(currentRow.querySelector('.load').textContent)>0&&d.get('status')==='Inactive'){alert('Open assignments block deactivation. Keep this technician active.');return}
 const row=editMode?currentRow:document.querySelector('#technician-rows tr').cloneNode(true)
 row.querySelector('strong').textContent=d.get('name');row.querySelector('small').textContent=d.get('reference');row.dataset.name=`${d.get('name')} ${d.get('reference')}`.toLowerCase();row.dataset.region=d.get('region');row.dataset.status=d.get('status');row.children[1].textContent=d.get('region');row.children[2].replaceChildren(...d.getAll('skills').map(s=>{const t=document.createElement('span');t.className='tag';t.textContent=s;return t}));row.querySelector('.status').textContent=d.get('status');row.querySelector('.status').className='status '+d.get('status').toLowerCase();row.querySelector('.avatar').textContent=String(d.get('name')).split(' ').map(n=>n[0]).slice(0,2).join('');if(!editMode){row.querySelector('.load').textContent='0';document.querySelector('#technician-rows').append(row)}refreshDetail(row);location.hash='technician-detail';showPage('technician-detail')
},true)
const confirmation=document.createElement('dialog');confirmation.className='state-dialog';confirmation.innerHTML='<div class="panel-title"><h2>Deactivate technician?</h2></div><p class="review-copy">Future assignments will exclude this technician. Historical records remain available.</p><div class="toolbar"><button class="button button-secondary">Cancel</button><button class="button button-danger">Confirm deactivation</button></div>';document.body.append(confirmation)
confirmation.querySelector('.button-secondary').onclick=()=>confirmation.close()
confirmation.querySelector('.button-danger').onclick=()=>{currentRow.dataset.status='Inactive';currentRow.querySelector('.status').textContent='Inactive';currentRow.querySelector('.status').className='status inactive';refreshDetail(currentRow);confirmation.close()}
document.querySelector('[data-deactivate]').addEventListener('click',event=>{event.stopImmediatePropagation();const count=Number(currentRow.querySelector('.load').textContent);if(count){document.querySelector('#deactivate-toast p').textContent=`${count} open jobs must be reassigned, completed, or cancelled first.`;document.querySelector('#deactivate-toast').hidden=false}else confirmation.showModal()},true)
