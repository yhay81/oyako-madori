# Security

脆弱性は公開Issueに詳細を書かず、GitHubのPrivate vulnerability reportingから報告してください。

- 施設リンクは公開HTTPSかつ公式情報に限定する。
- CSPで同一オリジン以外の実行資産を拒否する。
- 計測APIはsame-origin、JSON、厳密なshape、body上限、イベント許可リストを検査する。
- 正確な住所、現在地、写真、自由記述を受け取らない。
