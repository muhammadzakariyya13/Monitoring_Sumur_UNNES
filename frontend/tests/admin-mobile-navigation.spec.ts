import { expect, test } from "@playwright/test";
for (const [width, height] of [[360,800],[375,812],[390,844],[400,858],[430,932],[768,1024],[1366,900],[1440,900]]) {
 test(`Admin navigation ${width}`, async ({page}) => {
  await page.setViewportSize({width,height});
  const errors: string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/demo/admin/');
  const nav=page.getByRole('navigation',{name:'Navigasi utama'});
  if(width<=640){
   await expect(nav.getByRole('button')).toHaveText(['Beranda','Peta','Kelola','Riwayat','Profil']);
   await nav.getByRole('button',{name:'Kelola',exact:true}).click();
   await page.screenshot({path:`test-results/admin-hub-${width}.png`,fullPage:true});
   for(const name of ['Titik Monitoring Kelola Sumur dan Gedung','Pengguna Kelola akun dan hak akses']){
    await page.getByRole('region',{name:'Kelola',exact:true}).getByRole('button',{name}).click();
    await expect(nav.getByRole('button',{name:'Kelola',exact:true})).toHaveAttribute('aria-current','page');
    await expect(page.getByRole('button', {name:'Kembali', exact:true})).toBeVisible();
    const backBox = await page.getByRole('button', {name:'Kembali', exact:true}).boundingBox();
    expect(backBox!.width).toBeGreaterThanOrEqual(44);
    expect(backBox!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:`test-results/admin-child-${name.startsWith('Pengguna') ? 'users' : 'locations'}-${width}.png`,fullPage:true});
    await page.getByRole("button", { name: "Kembali", exact: true }).click();
   }
   for(const button of await nav.getByRole('button').all()){
    const box=await button.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(44);expect(box!.height).toBeGreaterThanOrEqual(44);
   }
   await nav.getByRole('button',{name:'Profil',exact:true}).click();
  } else {
   await expect(nav).not.toBeVisible();
   await expect(page.locator('.sidebar').getByRole('button',{name:'Kelola Titik Monitoring'})).toBeVisible();
   await page.locator('.sidebar').getByRole('button',{name:'Profil',exact:true}).click();
  }
  await expect(page.getByRole('region',{name:'Profil akun'})).toContainText('Admin');
  await expect(page.locator('.content').getByRole('button',{name:'Kelola Titik Monitoring'})).toHaveCount(0);
  await expect(page.locator('.content').getByRole('button',{name:'Pengguna',exact:true})).toHaveCount(0);
  await page.screenshot({path:`test-results/admin-profile-${width}.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Keluar',exact:true}).click();
  await expect(page).toHaveURL(/login/);
  await page.goto('/demo/');
  if(width<=640) {
   await expect(nav.getByRole('button')).toHaveText(['Beranda','Peta','Riwayat','Profil']);
   await expect(nav.getByRole('button',{name:'Kelola',exact:true})).toHaveCount(0);
  }
  expect(errors).toEqual([]);
 });
}
