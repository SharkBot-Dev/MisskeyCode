import express from "express";
import { loginSession } from "./cache/session.js";
import { AuthorizationCode } from "simple-oauth2";
import { mongoClient } from "./session.js";
import { encryptToken } from "./lib/encrypt.js";

export const app = express();

app.get('/', async (req, res) => {
    res.send('ここには何もないよ<br><link rel="redirect_uri" href="' + process.env.REDIRECT_URI_PATH + '">');
});

app.get('/terms', async (req, res) => {
    res.send(`<h1>利用規約</h1><p>
この利用規約で使用する言葉についての説明。

語句の解説
・「Bot」とは、本サービスのMisskeyCodeのことを表す。

使用者は以下の行為をしないものとする。

・犯罪行為に関連する行為
・サーバーまたはネットワークの機能を破壊したり、妨害したりする行為
・Botに攻撃をすること。
・Botの機能を破壊したり、妨害したりする行為
・運営を妨害するおそれのある行為
・他のユーザーに関する個人情報等を収集または蓄積する行為
・公式のコマンドを悪用する行為
・Botの機能を悪用する行為

以下に当てはまる使用者は使用してはならないものとする。

・荒らしに関与している使用者である場合
・当運営が利用することを相当でないと判断した場合
・Botの機能を悪用する目的である場合

運営は以下の理由の場合、サービスを一時的、または永久的に停止してよいものとする。また、責任は取らないものとする。

・地震、落雷、火災、停電または天災などの不可抗力により、本サービスの提供が困難となった場合
・コンピュータシステムの保守点検または更新を行う上でやむを得ないとき
・電気通信事業者の都合により本サービス用通信回線の使用が不能なとき
・オーナーの資金が尽きたとき。
・データベースが壊れた場合。

運営はユーザーの許可なしに利用規約を変更できるものとする。
本規約の解釈にあたっては、日本法を準拠法とする。

運営の故意や重大な過失でない場合、責任は負わない。

また、使用者がこれらの利用規約に違反した場合、いつでも利用を禁止することができる。

以上のことに同意できない場合は、
サービスを使用できないものとする。また、サービスを使用したら、
この利用規約を読んでいなくてもこの利用規約に同意したこととなる。
</p>`);
});

app.get('/privacy', async (req, res) => {
    res.send(`<h1>プライバシーポリシー</h1><p>
この利用規約で使用する言葉についての説明。

語句の解説
・「Bot」とは、本サービスのMisskeyCodeのことを表す。

保存するデータ
本Botでは、以下のデータを保存・もしくは使用します。
・コマンドを実行、使用した際に入力した内容
・Misskeyと連携した際のアクセストークン（暗号化されます。）
・Misskeyのユーザー情報

データの収集方法・保存方法
データは、Botがそのデータを必要とする場合に収集、または保存します。
保存場所は、MongoDBや、Redis（データベース）を用いて、本Botを運用しているサーバーに保存されます。

データの削除
データの削除は、Botのコマンドなどを用いて行うことができます。

また、このデータは決済情報の第三者（Stripe）への提供を行う場合があります。

本ポリシーの変更
運営者はBotの更新・法律の変更を反映するために、本ポリシーを変更することがあります。
いかなる変更も、運営者はユーザーに通知義務がないこととします。
本ポリシーを更新した時点で変更後のポリシーが有効となります。
</p>`);
});

app.get('/misskey/callback', async (req, res) => {
    const { code, state } = req.query;
    res.setHeader("Cache-Control", "no-store");

    if (typeof state !== "string" || !state) {
      return res.status(400).send("stateがありません");
    }

    const oauth = loginSession.get(state);

    if (!oauth) {
      return res.status(400).send("OAuthセッションがないか、すでに処理済みです。Discordの連携ボタンから認証をやり直してください。");
    }

    if (state !== oauth.state) {
      return res.status(400).send("stateが一致しません");
    }

    if (typeof req.query.error === "string") {
      loginSession.delete(state);
      return res.status(400).send("認証が許可されませんでした。Discordの連携ボタンから認証をやり直してください。");
    }

    if (typeof code !== "string" || !code) {
      return res.status(400).send("codeがありません");
    }

    // Consume the session before awaiting I/O: authorization codes are single-use.
    loginSession.delete(state);

    try {
        const tokenEndpoint = new URL(oauth.tokenEndpoint);
        const oauthClient = new AuthorizationCode({
        client: {
            // Also normalize sessions created before the login handler was updated.
            id: new URL(oauth.clientId).href,
            secret: "",
        },

        auth: {
            tokenHost: tokenEndpoint.origin,
            tokenPath: tokenEndpoint.pathname + tokenEndpoint.search,
        },

        options: {
            authorizationMethod: "body",
        },
        });

        const tokenParams = {
            code,
            redirect_uri: oauth.redirectUri,
            code_verifier: oauth.codeVerifier,
        };
        const token = await oauthClient.getToken(tokenParams);
        // console.log(token)

        await mongoClient.db("MisskeyCode").collection("LoginCode").updateOne({
            discordUserId: oauth.discordUserId,
            instance: oauth.instance
        }, {
            $set: {
                "accessToken": encryptToken(token.token.access_token as string)
            }
        }, {
            upsert: true
        })

        res.send("<h1>成功！登録しました！</h1>");
    } catch (error) {
        console.log(error)
        // Wreck errors include the request, which can contain codes and tokens.
        const responseError = error as {
          data?: { payload?: { error?: string }; res?: { statusCode?: number } };
        } | null;
        const oauthError = responseError?.data?.payload?.error;
        if (oauthError === "invalid_grant") {
          return res.status(400).send("認証コードが無効、期限切れ、または使用済みです。Discordの連携ボタンから認証をやり直してください。");
        }
        console.error("OAuthトークン取得失敗", {
          statusCode: responseError?.data?.res?.statusCode,
        });
        res.status(502).send("トークン取得に失敗しました。Discordの連携ボタンから認証をやり直してください。");
    }
});
