import express from "express";
import { loginSession } from "./cache/session.js";
import { AuthorizationCode } from "simple-oauth2";
import { mongoClient } from "./session.js";
import { encryptToken } from "./lib/encrypt.js";

export const app = express();

app.get('/', async (req, res) => {
    res.send('ここには何もないよ<br><link rel="redirect_uri" href="' + process.env.REDIRECT_URI_PATH + '">');
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
