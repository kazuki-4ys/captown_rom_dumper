# Captown ROM Dumper

カプコンは[Captown](https://captown.capcom.com/)の一部として2023/09/28までの期間限定で、NES,SNES,ファミコン、スーファミのゲームが遊べる[サイト](https://captown.capcom.com/ja/retro_games)

を公開しました。このサイトはサーバーからWebで動くエミュレーターと暗号されたROMをサーバーから配信し、

クライアント側でエミュレーターを用いてROMを複合し、ゲームを走らせています。

ROMは暗号されているため、これを取り出して一般的なエミュレーターで動かすのは不可能です。

しかし、Kazukiはブラウザのwasm仮想マシン内にあるヒープメモリから複合されたROMを発見しました。

このスクリプトはこのことを用いて複合されたROMをダンプするために開発されました。

Kazukiはこのスクリプトをカプコンがサイトを公開した2,3日後にはこのスクリプトを完成させていましたが、

後に遊べるゲームが追加される可能性などを考慮し、このスクリプトを9月まで一般公開しないことにしました。

**このスクリプトはパソコンでしかテストを行っておりません。おそらくスマホ、タブレット等では使用出来ないと思われます。**

## 複合されたROMのダンプ

以下の手順を踏むことで、複合されたROMのダンプが可能になります。

1. 名前を Captown ROM Dumper、リンクを `javascript:(function () {var s = document.createElement('script');s.setAttribute('src', 'https://cdn.discordapp.com/attachments/1011913296498143293/1119106289419685970/captown_rom_dumper.js');document.body.appendChild(s);}());` に設定してブックマークを作成します。
1. [Captown](https://captown.capcom.com/)のレトロゲームがあそべるサイト(例): [ロックマンX](https://captown.capcom.com/ja/retro_games/6/ja)へ移動します。
1. Captown ROM Dumper をブックマークから選択します。
1. 複合されたROMがダウンロードされます。(実際にはブラウザ内のwasm仮想マシン内のヒープメモリから複合されたROMを見つけて保存してるだけで、ダウンロードされている訳ではありません。)