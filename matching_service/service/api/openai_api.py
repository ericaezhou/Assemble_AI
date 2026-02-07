# pip install openai
# export OPENAI_API_KEY="你的key"   (macOS/Linux)
# setx OPENAI_API_KEY "你的key"     (Windows PowerShell 需要重新打开终端)

from openai import OpenAI

client = OpenAI()

def chat_once(history, user_text, model="gpt-5.2"):
    """
    history: list[dict], 形如:
      [{"role":"system","content":"..."}, {"role":"user","content":"..."}, {"role":"assistant","content":"..."}]
    user_text: 本轮用户输入
    return: (assistant_text, new_history)
    """
    input_messages = history + [{"role": "user", "content": user_text}]

    resp = client.responses.create(
        model=model,
        input=input_messages,
    )

    assistant_text = resp.output_text  # SDK 会帮你抽取文本输出 :contentReference[oaicite:1]{index=1}
    new_history = input_messages + [{"role": "assistant", "content": assistant_text}]
    return assistant_text, new_history


if __name__ == "__main__":
    history = [
        {"role": "system", "content": "你是一个简洁、准确的中文助手。"},
    ]

    print("输入 /exit 退出\n")
    while True:
        user_text = input("你: ").strip()
        if user_text.lower() in {"/exit", "exit", "quit"}:
            break

        ans, history = chat_once(history, user_text)
        print("助手:", ans)
