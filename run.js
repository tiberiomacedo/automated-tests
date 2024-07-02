const puppeteer = require('puppeteer');
const request = require('request');
const fs = require('fs');

// connect to existing browser instance
// const wsChromeEndpointurl = 'ws://127.0.0.1:9222/devtools/browser/93ed414e-16a1-49da-bdd8-106f2dcf9063';

const url = 'https://dev.vivo.com.br/para-empresas/produtos-e-servicos/servicos-essenciais/movel/planos/smart-empresas/simulador';
let browser;
let flag = false;

argCNPJ = '44861078000176';
if (process.argv.length > 2) {
    argCNPJ = process.argv[2];
}

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
                req.url().includes('/corporateManagement/v2/register/') ||
                req.url().includes('/opportunity/v2/signit') ||
                req.url().includes('/bin/vivo-portal/service-layer/send-email')
            ) {
                try {
                    console.timeLog('    time', '| request: ' + req.url());
                } catch { }
            } else if (req.url().includes('/corporateManagement/v2/failover/')) {
                console.log('        request: ' + req.url());
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
    console.log('    cnpj: ' + argCNPJ);
    const cnpj = await page.$('#input-cnpj');
    await cnpj.type(argCNPJ, { delay: 100 });
    await page.click('.title-company');

    let httpStatus;

    const waitFailover = page.waitForResponse((res) => {
        if (res.url().includes('/corporateManagement/v2/failover/')) {
            try {
                console.log('        response: ' + res.url() + ' | ' + res.status());
            } catch { }
        }
        httpStatus = res.status();
        return res.url().includes('/corporateManagement/v2/failover/') && res.request().method() == 'GET' && res.status() >= 200;
    }, { timeout: 30000 });
    await waitFailover;

    if (httpStatus != 200) {
        console.error('        api failover:', 'ocorreu erro');
        console.log('- - -');
        return;
    }

    try {
        await page.waitForFunction(
            'document.querySelector(".dados-cliente")'
            , { timeout: 10000 });
    } catch {
        console.error('        cnpj:', 'possui restrições');
        console.log('- - -');
        return;
    }

    try {
        await page.waitForFunction(
            'document.querySelector("#select-society-type > .selected.small > .selected--value > span").innerText != ""'
        );
    } catch {
        console.error('        tipo sociedade:', 'não identificado');
        console.log('- - -');
        return;
    }

    const complementElem = await page.$('.address-complement > .input-default > .form__input__control > .form__input__float > .form__input__container > input');
    const complement = await page.evaluate(el => el.value, complementElem);
    if (complement.length > 10) {
        console.error('        complemento endereço:', 'com mais de 10 craracteres');
        console.log('- - -');
        return;
    }

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

    const waitRegister = page.waitForResponse(async (res) => {
        if (
            res.url().includes('/bin/vivo-portal/service-layer/') ||
            res.url().includes('/corporateManagement/v2/register/')
        ) {
            try {
                console.timeLog('    time', '| response: ' + res.url() + ' | ' + res.status());
            } catch { }
        }
        httpStatus = res.status();
        return res.url().includes('/corporateManagement/v2/register/') && res.status() > 200;
    }, { timeout: 180000 });
    await waitRegister;

    if (httpStatus != 201) {
        console.error('        api register:', 'ocorreu erro');
        console.log('- - -');
        return;
    }

    const waitSignIt = page.waitForResponse(async (res) => {
        if (res.url().includes('/opportunity/v2/signit')) {
            try {
                console.timeLog('    time', '| response: ' + res.url() + ' | ' + res.status() + ' | ' + await res.text());
            } catch { }
        }
        return res.url().includes('/opportunity/v2/signit') && res.status() > 200;
    }, { timeout: 180000 });
    await waitSignIt;

    console.timeEnd('    time');
    console.log('- - -');
})()
    .catch(err => console.error(err))
    .finally(() => browser?.close()); // comment this line when connect to existing browser instance

function delay(time) {
    return new Promise(function (resolve) {
        setTimeout(resolve, time)
    });
};