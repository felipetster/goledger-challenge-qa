import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

async function login(page: any) {
  await page.goto(BASE);
  await page.getByPlaceholder('Enter your username').fill('admin');
  await page.getByPlaceholder('Enter your password').fill('admin123');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.locator('.page-title')).toHaveText('Books');
}

test('BUG-006 | Criar livro retorna 401 — Authorization header ausente em createBook()', async ({ page }) => {
  await login(page);

  let authHeaderPresent = false;
  page.on('request', req => {
    if (req.method() === 'POST' && req.url().includes('/books')) {
      authHeaderPresent = !!req.headers()['authorization'];
    }
  });

  await page.getByRole('button', { name: '+ New Book' }).click();
  await page.getByPlaceholder('e.g. The Go Programming Language').fill('Test Book');
  await page.getByPlaceholder('e.g. Alan Donovan').fill('Felipe Castro');
  await page.getByRole('button', { name: 'Create Book' }).click();
  await page.waitForTimeout(1500);

  await expect(page.locator('.alert-error')).toBeVisible();

  // DEVE FALHAR — prova o bug
  expect(
    authHeaderPresent,
    'BUG-006: POST /books enviado sem Authorization header. Adicionar Authorization: Bearer ${getToken()} em createBook() em api.ts.'
  ).toBe(true);
});

test('BUG-011 | Mensagem de erro ao criar livro é genérica — erro real da API descartado', async ({ page }) => {
  await login(page);

  await page.getByRole('button', { name: '+ New Book' }).click();
  await page.getByPlaceholder('e.g. The Go Programming Language').fill('Test Book');
  await page.getByPlaceholder('e.g. Alan Donovan').fill('Felipe Castro');
  await page.getByRole('button', { name: 'Create Book' }).click();
  await page.waitForTimeout(1500);

  const errorText = await page.locator('.alert-error').textContent();

  // DEVE FALHAR — prova o bug
  expect(
    errorText,
    'BUG-011: Mensagem genérica exibida. O catch em handleCreate descarta o erro real com _err.'
  ).not.toBe('An error occurred. Please try again.');
});

test('BUG-010 | Botão Prev sempre volta para página 1 em vez de page - 1', async ({ page }) => {
  await login(page);

  await page.getByPlaceholder('Search by author name').fill('a');
  await page.getByRole('button', { name: /Search/ }).click();
  await page.waitForTimeout(1500);

  const nextBtn = page.getByRole('button', { name: /Next/ });
  const prevBtn = page.getByRole('button', { name: /Prev/ });

  if (!await nextBtn.isVisible()) {
    test.skip(true, 'Sem resultados suficientes para testar paginação.');
    return;
  }

  await nextBtn.click();
  await page.waitForTimeout(500);
  await expect(page.getByText('Page 2')).toBeVisible();

  if (await nextBtn.isEnabled()) {
    await nextBtn.click();
    await page.waitForTimeout(500);
    await expect(page.getByText('Page 3')).toBeVisible();

    await prevBtn.click();
    await page.waitForTimeout(500);

    // DEVE FALHAR — prova o bug
    await expect(
      page.getByText('Page 2'),
      'BUG-010: Clicando Prev na página 3 deveria ir para página 2. Foi para página 1. handlePrev() usa const prev = 1.'
    ).toBeVisible();
  }
});

test('TC-BWEB-004 | Busca sem autor exibe mensagem de validação', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: /Search/ }).click();
  await page.waitForTimeout(500);
  await expect(page.locator('.alert-error')).toBeVisible();
});
