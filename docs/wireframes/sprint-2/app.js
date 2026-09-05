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
