/* Same tests on developer machines and CI; no workstation-specific paths. */
const {chromium}=require('playwright');
const launch=chromium.launch.bind(chromium);
chromium.launch=options=>launch({
 headless:true,
 ...(process.env.GUROV_BROWSER_EXECUTABLE?{executablePath:process.env.GUROV_BROWSER_EXECUTABLE}:{}),
 ...options
});
module.exports={chromium};
