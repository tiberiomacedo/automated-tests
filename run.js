const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');

// connect to existing browser instance
// const wsChromeEndpointurl = 'ws://127.0.0.1:9222/devtools/browser/93ed414e-16a1-49da-bdd8-106f2dcf9063';

const url = 'https://dev.vivo.com.br/para-empresas/produtos-e-servicos/servicos-essenciais/movel/planos/smart-empresas/simulador';
let browser;
let flag = false;

(async () => {
    browser = await puppeteer.launch({
        headless: true,
        devtools: false,
        ignoreDefaultArgs: ['--enable-automation'],
        defaultViewport: null,
        args: ['--start-maximized', '--no-sandbox'],
        executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        userDataDir: '/Users/tiberiomacedo/Library/Application Support/Google/Chrome for Testing/puppeteer'
    });
    // connect to existing browser instance
    // const browser = await puppeteer.connect({
    //     browserWSEndpoint: wsChromeEndpointurl,
    //     defaultViewport: null
    // });

    const page = await browser.newPage();

    await page.setRequestInterception(true);

    page.on('request', req => {
        if (req.url().includes('/customerManagement/v2/customers/getsCustomerECOMSFA')) {
            const cert = fs.readFileSync('/Users/tiberiomacedo/certificates/api-hml.telefonica.com.br.pem');

            const options = {
                uri: req.url(),
                method: req.method(),
                headers: req.headers(),
                body: req.postData(),
                cert: cert
            };

            request(options, function (err, resp, body) {
                if (err) {
                    console.error(`Unable to call ${options.uri}`, err);
                    return request.abort('connectionrefused');
                }
                req.respond({
                    status: resp.statusCode,
                    contentType: resp.headers['content-type'],
                    headers: resp.headers,
                    body: body
                });
            });
        } else {
            if (
                req.url().includes('/bin/vivo-portal/service-layer/return-ip') ||
                req.url().includes('/bin/vivo-portal/service-layer/transational-topaz/v1/analytics') ||
                req.url().includes('/corporateManagement/v2/register/') || req.url().includes('/opportunity/v2/signit') ||
                req.url().includes('/bin/vivo-portal/service-layer/send-email')
            ) {
                try {
                    console.timeLog('    time', '| request: ' + req.url());
                } catch { }
            }
            req.continue();
        }
    });

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/66.0.3359.181 Safari/537.36');

    await page.goto(url, {
        waitUntil: ['domcontentloaded', 'networkidle2'],
        timeout: 30000
    });

    console.log('[personalização]');
    console.log('    ddd: ' + '11');
    const ddd = await page.$('input.form__input__value');
    await ddd.type('11', { delay: 220 });

    const buttonNextStep = await page.$('#button-next-step');
    await buttonNextStep.click();

    await delay(2000);

    console.log('[identificação]');
    console.log('    cnpj: ' + '44861078000176');
    const cnpj = await page.$('#input-cnpj');
    await cnpj.type('44861078000176', { delay: 100 });
    await page.click('.title-company');

    const waitFailover = page.waitForResponse((response) => {
        return response.url().includes('/corporateManagement/v2/failover/') && response.status() == 200;
    }, { timeout: 30000 });
    await waitFailover;

    await page.waitForFunction(
        'document.querySelector("#select-society-type > .selected.small > .selected--value > span").innerText != ""'
    );

    await delay(2500);

    console.log('    cpf: ' + '33958559026');
    const cpf = await page.$('#input-cpf');
    await cpf.type('33958559026', { delay: 100 });

    await delay(1000);

    console.log('    nome: ' + 'Joao Paulo da Silva');
    const name = await page.$('#input-name');
    await name.type('Joao Paulo da Silva', { delay: 100 });

    await delay(1000);

    console.log('    email: ' + 'joao.silva@terra.com');
    const email = await page.$('#input-email');
    await email.type('joao.silva@terra.com', { delay: 100 });

    await delay(1000);

    console.log('    celular: ' + '11988784523');
    const cellphone = await page.$('#input-cellphone');
    await cellphone.type('11988784523', { delay: 100 });

    await delay(1000);

    console.log('    dia do vencimento: ' + '29');
    const dueDate = await page.$('#radio-29');
    await dueDate.click();

    await delay(1000);

    console.log('[finalizar]');
    const finishPurchase = await page.$('#finish-purchase');
    await finishPurchase.click();

    flag = true;

    console.time('    time');

    const waitSignit = page.waitForResponse(async (res) => {
        if (
            res.url().includes('/bin/vivo-portal/service-layer/return-ip') ||
            res.url().includes('/bin/vivo-portal/service-layer/transational-topaz/v1/analytics') ||
            res.url().includes('/corporateManagement/v2/register/') || res.url().includes('/opportunity/v2/signit') ||
            res.url().includes('/bin/vivo-portal/service-layer/send-email')
        ) {
            try {
                console.timeLog('    time', '| response: ' + res.url() + ' | ' + res.status());
            } catch { }
        }
        return res.url().includes('/opportunity/v2/signit') && res.status() == 201;
    }, { timeout: 180000 });
    await waitSignit;

    console.timeEnd('    time');

    // await delay(5000);
})()
    .catch(err => console.error(err))
    .finally(() => browser?.close()); // comment this line when connect to existing browser instance

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
};