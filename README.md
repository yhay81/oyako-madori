# おやこ間取り

授乳室とおむつ交換スペースを、設備・利用者・館内位置・公式確認日から選ぶ、広告なしの小さな公開案内です。

<https://oyako-madori.yhay81.com>

現在地や住所、口コミ、写真、家族の情報を預からず、施設・自治体の公式HTTPSページを正本として案内します。初期版は東京都心の公式情報を手作業で収録しています。

## Development

```powershell
npm ci
npx wrangler d1 migrations apply oyako-madori --local
npm run dev
```

## Verification

```powershell
npm run release:check
npm run check
npm test
npm run build
```
