const puppeteer = require('puppeteer');
const fs = require('fs');

// TODO: Load the credentials from the 'credentials.json' file
// HINT: Use the 'fs' module to read and parse the file
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));

(async () => {
    // TODO: Launch a browser instance and open a new page
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Navigate to GitHub login page
    await page.goto('https://github.com/login');

    // TODO: Login to GitHub using the provided credentials
    // HINT: Use the 'type' method to input username and password, then click on the submit button
    await page.type('#login_field', credentials.username);
    await page.type('#password', credentials.password);
    await page.click('input[type="submit"]');

    // Wait for successful login
    await page.waitForSelector('.avatar.circle');

    // Extract the actual GitHub username to be used later
    const actualUsername = await page.$eval('meta[name="octolytics-actor-login"]', meta => meta.content);

    const repositories = ["cheeriojs/cheerio", "axios/axios", "puppeteer/puppeteer"];

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Star the repository
        // HINT: Use selectors to identify and click on the star button
        try {
            const starBtnSelector = 'button[aria-label*="Star this repository"]';
            await page.waitForSelector(starBtnSelector, { timeout: 5000 });
            await page.click(starBtnSelector);
            // waitForTimeout doesn't exist in puppeteer anymore so I am using this instead
            // I replaced all waitForTimeout lines with this method
            await new Promise(resolve => setTimeout(resolve, 1500));
        } catch {}
    }

    // TODO: Navigate to the user's starred repositories page
    await page.goto(`https://github.com/${actualUsername}?tab=stars`);

    // TODO: Click on the "Create list" button
    await new Promise(resolve => setTimeout(resolve, 3000));
    const buttons = await page.$$('button');
    let createListBtn;
    for (const btn of buttons) {
        const text = await btn.evaluate(b => b.innerText.trim());
        if (text === 'Create list') {
            createListBtn = btn;
            break;
        }
    }
    if (createListBtn) {
        await createListBtn.click();
    }

    // TODO: Create a list named "Node Libraries"
    // HINT: Wait for the input field and type the list name
    const listInput = await page.waitForSelector('#user_list_name', { visible: true });
    await listInput.click();
    await listInput.type("Node Libraries");
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Wait for buttons to become visible
    const createBtn = await page.waitForSelector('.Button--fullWidth.mt-2:not([disabled])', { visible: true });
    await createBtn.evaluate(b => b.click());
    await new Promise(resolve => setTimeout(resolve, 2500));

    for (const repo of repositories) {
        await page.goto(`https://github.com/${repo}`);

        // TODO: Add this repository to the "Node Libraries" list
        // HINT: Open the dropdown, wait for it to load, and find the list by its name
        const dropdownSelector = 'summary[aria-label="Add this repository to a list"]';
        await page.waitForSelector(dropdownSelector, { visible: true, timeout: 5000 });
        const dropdown = await page.$(dropdownSelector);
        await dropdown.evaluate(b => b.scrollIntoView({ block: 'center' }));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await dropdown.click();
        await new Promise(resolve => setTimeout(resolve, 1500));

        const lists = await page.$$('.js-user-list-menu form');
        for (const list of lists) {
            const textHandle = await list.getProperty('innerText');
            const text = await textHandle.jsonValue();
            if (text.includes('Node Libraries')) {
                await list.click();
                break;
            }
        }

        // Allow some time for the action to process
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Close the dropdown to finalize the addition to the list
        await dropdown.click();
    }

    // Close the browser
    await browser.close();
})();