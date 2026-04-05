import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';
const ADMIN = { username: 'admin', password: 'admin123' };

async function login(page: any, username = ADMIN.username, password = ADMIN.password) {
  await page.goto(BASE);
  await page.getByPlaceholder('Enter your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('.page-title')).toBeVisible();
}

test('TC-AUTH-001 | Login válido redireciona para Books', async ({ page }) => {
  await login(page);
  await expect(page.locator('.page-title')).toHaveText('Books');
});

test('TC-AUTH-002 | Login com senha errada exibe erro e permanece na tela de login', async ({ page }) => {
  await page.goto(BASE);
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('senhaerrada');
  await page.getByRole('button', { name: 'Sign In' }).click();

  await expect(page.locator('.alert-error')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});

test('BUG-001 | Logout não limpa o token — sessão persiste após reload', async ({ page }) => {
  await login(page);
  await expect(page.locator('.page-title')).toHaveText('Books');

  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.reload();

  // DEVE FALHAR — prova o bug
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
    'BUG-001: Após logout e reload, usuário deveria ver login mas foi redirecionado para Books. removeToken() não é chamado em handleLogout().'
  ).toBeVisible();
});

test('TC-AUTH-004 | Token salvo no localStorage após login', async ({ page }) => {
  await login(page);
  const token = await page.evaluate(() => localStorage.getItem('qa_api_token'));
  expect(token, 'Token deve estar presente no localStorage após login').not.toBeNull();
});

test('TC-AUTH-005 | BUG-001 — Token permanece no localStorage após logout', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Logout' }).click();

  const token = await page.evaluate(() => localStorage.getItem('qa_api_token'));

  // DEVE FALHAR — prova o bug
  expect(
    token,
    'BUG-001: Token ainda presente no localStorage após logout. removeToken() nunca é chamado em handleLogout().'
  ).toBeNull();
});
