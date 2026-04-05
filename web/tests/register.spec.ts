import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test('BUG-012 | Registro não possui campo de confirmação de senha', async ({ page }) => {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Register' }).click();
  await expect(page.getByRole('heading', { name: 'Create account' })).toBeVisible();

  const confirmField = page.getByPlaceholder(/confirm/i);

  // DEVE FALHAR — prova o bug
  await expect(
    confirmField,
    'BUG-012: Campo de confirmação de senha ausente. Usuário pode registrar com senha incorreta por erro de digitação.'
  ).toBeVisible();
});

test('TC-REG-002 | Registro com dados válidos redireciona para login', async ({ page }) => {
  await page.goto(BASE);
  await page.getByRole('button', { name: 'Register' }).click();

  const uniqueUser = `qa_user_${Date.now()}`;
  await page.getByPlaceholder('Choose a username').fill(uniqueUser);
  await page.getByPlaceholder('Choose a password').fill('senha123');
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
