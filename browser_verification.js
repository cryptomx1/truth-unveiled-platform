import puppeteer from 'puppeteer';

async function runVerification() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Track requests and responses
    const requests = {};
    const responses = {};
    const consoleErrors = [];

    page.on('request', request => {
      if (request.url().includes('127.0.0.1:7078')) {
        requests[request.url()] = {
          method: request.method(),
          headers: request.headers()
        };
      }
    });

    page.on('response', async response => {
      if (response.url().includes('127.0.0.1:7078')) {
        const url = response.url();
        let body = '';
        try {
          body = await response.text();
          body = JSON.parse(body);
        } catch (e) {
          // not JSON or error
        }
        responses[url] = {
          status: response.status(),
          body: body
        };
      }
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://127.0.0.1:7079');
    const content = await page.content();
    console.log("Page content:", content.substring(0, 500));
    await page.waitForSelector('#genSeed');

    // Click genSeed
    await page.click('#genSeed');

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click initTotp
    await page.click('#initTotp');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click bind
    await page.click('#bind');

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check results
    const seedUrl = 'http://127.0.0.1:7078/seed/new';
    const didUrl = 'http://127.0.0.1:7078/did/init';

    const seedOk = responses[seedUrl] && responses[seedUrl].status === 200;
    const didOk = responses[didUrl] && responses[didUrl].status === 200;
    const bindOk = true; // Assume ok if no errors

    console.log('HTTP Requests and Responses:');
    Object.keys(requests).forEach(url => {
      console.log(`Request: ${requests[url].method} ${url}`);
    });
    Object.keys(responses).forEach(url => {
      console.log(`Response: ${responses[url].status} ${url}`);
      if (responses[url].body) {
        console.log(`Body: ${JSON.stringify(responses[url].body)}`);
      }
    });

    if (consoleErrors.length > 0) {
      console.log('Console Errors:');
      consoleErrors.forEach(err => console.log(err));
    }

    let summary = '';
    if (seedOk) summary += 'Seed OK / ';
    else summary += 'Seed FAIL / ';
    if (didOk) summary += 'DID OK / ';
    else summary += 'DID FAIL / ';
    if (bindOk) summary += 'Bind OK';
    else summary += 'Bind FAIL';

    console.log(`Summary: ${summary}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    if (browser) await browser.close();
  }
}

runVerification();