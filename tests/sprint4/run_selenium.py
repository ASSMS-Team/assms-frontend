"""Fresh-browser Selenium smoke/navigation assertions with actual UI screenshots."""
import json, os, sys
from support import Run, HERE, FRONTEND, ACCOUNTS
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

def main():
    run=Run('selenium')
    options=Options(); options.add_argument('--headless=new'); options.add_argument('--window-size=1440,1000')
    driver=webdriver.Chrome(options=options); wait=WebDriverWait(driver,20)
    fixtures=json.loads((HERE/'artifacts/fixtures.json').read_text()) if (HERE/'artifacts/fixtures.json').exists() else {}
    run.save('browser.json',{'browser':driver.capabilities.get('browserName'),'version':driver.capabilities.get('browserVersion')})
    def clear():
        driver.get(FRONTEND+'/login'); driver.execute_script('localStorage.clear();sessionStorage.clear();'); driver.delete_all_cookies(); driver.get(FRONTEND+'/login')
    def login(role):
        clear(); username,password=ACCOUNTS[role]
        wait.until(EC.visibility_of_element_located((By.ID,'identifier'))).send_keys(username)
        driver.find_element(By.ID,'password').send_keys(password)
        driver.find_element(By.CSS_SELECTOR,'button[type="submit"],.auth-submit').click()
        wait.until(lambda d:'/login' not in d.current_url)
    def check(id,title,fn):
        def capture():
            try: fn()
            finally:
                # Never capture typed passwords, even on a failed login.
                for element in driver.find_elements(By.CSS_SELECTOR,'input[type="password"]'):
                    driver.execute_script('arguments[0].value=""',element)
                p=run.folder/'screenshots'/f'{id}.png'; p.parent.mkdir(exist_ok=True)
                driver.save_screenshot(str(p))
            return {'url':driver.current_url,'screenshot':f'screenshots/{id}.png'}
        run.case(id,title,capture)
    def invalid():
        clear(); wait.until(EC.visibility_of_element_located((By.ID,'identifier'))).send_keys('qa.invalid')
        driver.find_element(By.ID,'password').send_keys('IncorrectPassword!123')
        driver.find_element(By.CSS_SELECTOR,'.auth-submit').click()
        alert=wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR,'[role="alert"]')))
        assert 'Invalid username/email or password' in alert.text
    def manager():
        login('Manager'); wait.until(EC.visibility_of_element_located((By.TAG_NAME,'h1')))
        assert 'Customers' in driver.find_element(By.TAG_NAME,'h1').text
    def technician_queue():
        assert fixtures,'Prepare fixtures before Selenium'
        login('Technician A'); driver.get(FRONTEND+'/my-jobs')
        wait.until(lambda d:fixtures['jobReference'] in d.find_element(By.TAG_NAME,'body').text)
        assert 'My Jobs' in driver.find_element(By.TAG_NAME,'body').text
    def own_job():
        driver.get(FRONTEND+'/jobs/'+fixtures['jobId'])
        wait.until(lambda d:fixtures['jobReference'] in d.find_element(By.TAG_NAME,'body').text)
        assert driver.find_elements(By.TAG_NAME,'button')
        assert 'Job not found or Job Service is unavailable' not in driver.find_element(By.TAG_NAME,'body').text
    def restricted():
        login('Technician B'); driver.get(FRONTEND+'/technicians/new')
        wait.until(lambda d:'/forbidden' in d.current_url)
    def report():
        login('Manager'); driver.get(FRONTEND+'/reports/job-completions')
        wait.until(EC.visibility_of_element_located((By.TAG_NAME,'h1')))
        assert 'completion' in driver.find_element(By.TAG_NAME,'h1').text.lower()
    try:
        for id,title,fn in [('S4-UI-01','Invalid login error',invalid),('S4-UI-02','Manager login and customers navigation',manager),('S4-UI-03','Linked technician My Jobs',technician_queue),('S4-UI-04','Own job detail navigation',own_job),('S4-UI-05','Technician denied technician-management route',restricted),('S4-UI-06','Manager completion-report navigation',report)]: check(id,title,fn)
    finally: driver.quit()
    print('Evidence:',run.folder)
    return 1 if any(r['status']=='Fail' for r in run.results) else 0

if __name__=='__main__': sys.exit(main())
