const puppeteer = require('puppeteer');
const fs = require('fs').promises; //for working with files

//save cookie function
const saveCookie = async (page) => {
    const cookies = await page.cookies();
    const cookieJson = JSON.stringify(cookies, null, 2);
    await fs.writeFile('cookies.json', cookieJson);
}

//load cookie function
const loadCookie = async (page) => {
    const cookieJson = await fs.readFile('cookies.json');
    const cookies = JSON.parse(cookieJson);
    await page.setCookie(...cookies);
}

(async () => {
  await fs.writeFile('cookies.json', "[]");   // clear cookies

  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 5.1; rv:5.0) Gecko/20100101 Firefox/5.0')
  await loadCookie(page); //load cookie
  await page.goto('https://www.ozon.ru/product/jacobs-monarch-intense-kofe-rastvorimyy-150-g-33871138/?asb=f6eiFDMP8VRrUFn5wAPstGxdXBhSMKPf2lqoaLEIA1wvBQ4vyYzk8l0C0BOjZ%252FzD&asb2=9m0P7J0fV8rotOPVSPAulLsYNMvlOpMdHe9DeughNhwL4C_DjbOiMT4ZGBN5wKaLNM5J7UXUI3fWSud97kudOWYs8YG-XWvXfG9MtaWPc8j5VTWAjewFj5781EQtKPakjmnWoajwHjz2C19bzKevWg&avtc=1&avte=2&avts=1666115663&keywords=jacobs+intense&sh=tWlsT5anMA',
    { waitUntil: 'domcontentloaded' });
  await saveCookie(page); //save cookie

  await page.waitForSelector('script[type="application/ld+json"]');
  const result = await page.evaluate(() => document.querySelector('script[type="application/ld+json"]').innerHTML)
  
  const json = JSON.parse(result)
  const info = {
    name: json["name"],
    description: json["description"],
    url: json["offers"]["url"],
    price: json["offers"]["price"],
    currency: json["offers"]["priceCurrency"],
    image: json["image"]
  }

  console.log(JSON.stringify(info));

  await browser.close();
})();
