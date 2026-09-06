use anyhow::Result;
use reqwest::Client;
use serde_json::{json, Value};
use tauri::AppHandle;

fn get_system_prompt(from: &str, to: &str) -> String {
    format!(
        r#"<task>将用户输入从【{}】翻译到【{}】</task>

<requirements>
1. 直接输出翻译结果，禁止任何解释
2. 口语化、自然、简洁，符合聊天场景
3. 保留数字、专有名词和游戏术语（如技能、装备、武器缩写）
4. 禁止换行和Markdown
</requirements>

<output_format>
仅输出一条最终翻译结果，不要包含任何思考过程或解释
</output_format>"#,
        from, to
    )
}

pub async fn translate_with_gpt(app: &AppHandle, original: &str) -> Result<String> {
    let settings = crate::store::get_settings(app)?;
    let model_config = settings.custom_model.clone();

    println!("当前翻译设置:");
    println!("- 源语言: {}", settings.translation_from);
    println!("- 目标语言: {}", settings.translation_to);
    println!("正在发送请求到: {}", model_config.api_url);
    println!("使用的模型: {}", model_config.model_name);

    let system_prompt = get_system_prompt(&settings.translation_from, &settings.translation_to);

    let client = Client::builder()
        .timeout(std::time::Duration::from_secs(20))
        .connect_timeout(std::time::Duration::from_secs(10))
        .build()?;

    let request_body = json!({
        "model": model_config.model_name,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": original
            }
        ],
        "max_tokens": 300,
        "temperature": 0.3,
        "top_p": 0.3,
        "n": 1,
        "stream": false
    });

    let response = match client
        .post(&model_config.api_url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", model_config.auth))
        .header(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TransKey/0.2",
        )
        .json(&request_body)
        .send()
        .await
    {
        Ok(resp) => resp,
        Err(e) => {
            let error_msg = match e.to_string().as_str() {
                msg if msg.contains("connection refused") => "无法连接到API服务器，请检查网络设置",
                msg if msg.contains("timeout") => "请求超时，请检查网络连接",
                msg if msg.contains("certificate") => "SSL证书验证失败，请检查网络设置",
                _ => "网络请求失败",
            };
            println!("请求失败: {}", e);
            return Ok(format!("[错误] {}", error_msg));
        }
    };

    let status = response.status();
    let raw_text = match response.text().await {
        Ok(text) => text,
        Err(e) => {
            println!("读取响应失败: {}", e);
            return Ok(format!("[错误] 读取服务器响应失败: {}", e));
        }
    };
    println!("HTTP状态: {}, 响应原文: {:?}", status, raw_text);

    // 识别常见错误格式：智谱 error_msg / OpenAI error.message / 硅基流动顶层 message、msg
    let json: Value = match serde_json::from_str::<Value>(&raw_text) {
        Ok(json) => {
            let has_choices = json.get("choices").is_some();
            if !has_choices {
                if let Some(msg) = json
                    .get("error_msg")
                    .and_then(|m| m.as_str())
                    .or_else(|| json.pointer("/error/message").and_then(|m| m.as_str()))
                    .or_else(|| json.get("message").and_then(|m| m.as_str()))
                    .or_else(|| json.get("msg").and_then(|m| m.as_str()))
                {
                    println!("API返回错误: {}", msg);
                    return Ok(format!("[错误] {}", msg));
                }
            }
            json
        }
        Err(_) => {
            let snippet: String = raw_text.chars().take(150).collect();
            return Ok(format!(
                "[错误] 服务器返回了非JSON响应(HTTP {}): {}",
                status, snippet
            ));
        }
    };
    let translated = match json
        .get("choices")
        .and_then(|choices| choices.as_array())
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(|content| content.as_str())
    {
        Some(text) => {
            let text = text.trim();
            // 如果找到</think>标签，只保留其后内容
            if let Some(end_pos) = text.find("</think>") {
                text[(end_pos + 8)..].trim().to_string()
            } else {
                text.to_string()
            }
        }
        None => {
            let snippet: String = raw_text.chars().take(150).collect();
            println!("无法从响应中提取翻译结果");
            return Ok(format!(
                "[错误] 未能从服务器响应中提取翻译(HTTP {}): {}",
                status, snippet
            ));
        }
    };

    Ok(translated)
}
