import { expect, test } from '@playwright/test';

test('root redirects to the daily agenda', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/today$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('月');
});

test('bottom navigation opens every primary page', async ({ page }) => {
  await page.goto('/today');
  for (const [label, path] of [['收件箱', '/inbox'], ['待办', '/tasks'], ['完成', '/completed'], ['设置', '/settings']] as const) {
    await page.getByRole('link', { name: label }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test('creates, completes, and restores a manual task', async ({ page }) => {
  const title = `准备数据库课堂展示 ${Date.now()}`;
  await page.goto('/tasks');
  await page.getByRole('button', { name: '新建任务' }).click();
  await page.getByPlaceholder('例如：提交计算机网络作业').fill(title);
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  await page.getByLabel('截止时间').fill(tomorrow);
  await page.getByRole('button', { name: '保存到待办' }).click();
  await expect(page.getByText(title, { exact: true })).toBeVisible();
  const card = page.locator('.task-card').filter({ hasText: title });
  await card.getByRole('button').click();
  await expect(page.getByText(title, { exact: true })).not.toBeVisible();
  await page.goto('/completed');
  const completedCard = page.locator('.task-card').filter({ hasText: title });
  await expect(completedCard).toBeVisible();
  await completedCard.getByRole('button').click();
  await expect(page.getByText(title, { exact: true })).not.toBeVisible();
});

test('image inbox exposes editable OCR output', async ({ page }) => {
  await page.goto('/inbox');
  await page.getByRole('button', { name: /上传截图/ }).click();
  await expect(page.getByLabel('识别文字（可编辑）')).toBeVisible();
  await page.getByLabel('识别文字（可编辑）').fill('周五下午三点在教二 302 答疑');
  await expect(page.getByLabel('识别文字（可编辑）')).toHaveValue('周五下午三点在教二 302 答疑');
});

test('review requires explicit selection before database save', async ({ page, request }) => {
  const imported = await request.post('/api/imports', { data: { inputType: 'text', rawText: '实验报告明晚十点前提交' } });
  const record = await imported.json() as { id: string };
  await request.post(`/api/imports/${record.id}/demo-extract`);
  await page.goto(`/review/${record.id}`);
  await expect(page.getByText('实验报告明晚十点前提交')).toBeVisible();
  await expect(page.getByText(/识别出 2 条信息/)).toBeVisible();
  await page.getByRole('button', { name: /保存 2 条到任务面板/ }).click();
  await expect(page).toHaveURL(/\/today$/);
});

test('ChatGPT connection state is honest when signed out', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('ChatGPT 尚未连接')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Continue with ChatGPT' })).toBeVisible();
});
