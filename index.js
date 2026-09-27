const { Client, GatewayIntentBits } = require("discord.js");
const http = require("http");

// Render 서버가 잠들지 않도록 켜두는 간단한 웹서버
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running 24/7!");
}).listen(process.env.PORT || 3000);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 상점 기본 규정 및 가격표
const STORE_RULES = `
당신은 발로란트 랜덤 계정 전문 판매점 디스코드 티켓 상담원입니다.
정중하고 명확한 존댓말로 손님에게 답변하세요. 
모르는 내용이나 규정에 없는 사실은 지어내지 말고 "해당 내용은 담당자(사장님)가 확인 후 답변드리겠습니다"라고 안내하세요.

[상점 취급 계정 및 가격표]
■ 아시아 서버 (ASIA) 랜덤 계정 (공통: 스킨/레벨/티어/요원/VP 랜덤, 수령 후 10분 보증, 1000원 이하 상품 교환 제외):
- 스킨 1~10개: 30원
- 스킨 11~20개: 60원
- 스킨 21~30개: 150원
- 스킨 31~40개: 200원
- 스킨 41~50개: 500원
- 스킨 61~100개: 1,100원
- 스킨 101~150개: 1,600원
- 스킨 151~200개: 2,500원
- 스킨 201~1000개: 3,500원

■ 한국 서버 (KR) 랜덤 계정 (공통: 스킨/레벨/티어/요원/VP 랜덤, 수령 후 10분 보증, 1000원 이하 상품 교환 제외):
- 스킨 1~10개: 900원
- 스킨 11~20개: 2,100원
- 스킨 21~30개: 3,000원
- 스킨 31~40개: 3,800원
- 스킨 41~50개: 4,800원
- 스킨 61~100개: 6,500원
- 스킨 101~150개: 8,000원
- 스킨 151~200개: 9,500원
- 스킨 201~1000개: 9,900원

[보증 및 교환 규정]
- 보증 기한: 수령 후 10분 이내 (10분 초과 시 예외 처리 가능한지 사장님이 직접 검토해 드릴 예정이니 자료 남겨달라고 유연하게 안내)
- 필수 조건: 구매 시점부터 로그인 시도까지의 '무편집 녹화본 영상' 필수
- 교환 가능: 영구정지, 계정잠금, 비번 불일치, 이메일 2차인증, VAL 59 오류 (1,000원 이상 상품만, 최초 1회 한정)
- 교환 불가: 1,000원 이하 저가 상품(교환/환불 절대 불가), 단순 변심, 스킨 불만족, 경쟁전/일시 정지, VAL 3(동시접속)
- 이미 1회 교환을 완료한 경우 추가 교환은 절대 불가합니다.

[문의 양식 안내]
- 충전 문의: 입금자명 + 충전금액 + 이체내역 이중창 캡처(디스코드 창과 은행 송금 내역이 한 화면에 나오게)
- 불량 문의: 구매내역 캡처 + 불량인증 로그인 무편집 영상

[특수 문의 처리]
- 파트너/제휴 문의: "파트너 링크 보내주시고 잠시만 기다려주세요! 사장님이 확인 후 순차적으로 답변드리겠습니다."
- 욕설/폭언: 정중하게 1차 경고 후, 지속되면 사장님 인계 안내
`;

// AI 답변 생성 (간단하고 정확한 빠른 응답 생성기)
async function getReply(userMessage) {
  const msg = userMessage.trim();
  
  // 1. 파트너 문의
  if (msg.includes("파트너") || msg.includes("제휴") || msg.includes("홍보")) {
    return "파트너 링크 보내주시고 잠시만 기다려주세요! 사장님이 확인 후 순차적으로 답변드리겠습니다.";
  }

  // 2. 사장님/관리자 호출
  if (msg.includes("사장") || msg.includes("관리자") || msg.includes("사람")) {
    return "담당자(사장님)에게 전달되었습니다! 확인하는 대로 신속히 답변드리겠습니다. 문의 내용을 미리 남겨주시면 더욱 빠른 처리가 가능합니다.";
  }

  // 3. 충전 문의
  if (msg.includes("충전") || msg.includes("입금") || msg.includes("이체") || msg.includes("계좌")) {
    return "충전 문의 양식 안내드립니다!\n\n1. 입금자명\n2. 충전 금액\n3. 이체내역 이중창 캡처 (디스코드 창과 은행 송금 완료 내역이 한 화면에 보이도록)\n\n위 양식을 남겨주시면 사장님이 확인 후 빠르게 충전해 드립니다.";
  }

  // 4. 불량 / 교환 / 비번 오류 문의
  if (msg.includes("교환") || msg.includes("환불") || msg.includes("비번") || msg.includes("불량") || msg.includes("로그인") || msg.includes("정지") || msg.includes("잠금")) {
    return "계정 문제 관련 안내드립니다!\n\n• 1,000원 이하 저가 상품: 규정상 교환 및 환불이 절대 불가합니다.\n• 1,000원 이상 상품: [구매내역 캡처] + [수령 직후 로그인 시도 무편집 녹화본 영상]을 남겨주시면 사장님이 확인 후 교환(최초 1회 한정) 처리해 드립니다.\n\n※ 자료를 티켓에 남겨주시면 순차적으로 확인 도와드리겠습니다.";
  }

  // 5. 가격 문의 (아시아)
  if (msg.includes("아시아") || msg.includes("아샤") || msg.includes("asia")) {
    return "【아시아 서버 랜덤 계정 가격표】\n• 1~10개: 30원\n• 11~20개: 60원\n• 21~30개: 150원\n• 31~40개: 200원\n• 41~50개: 500원\n• 61~100개: 1,100원\n• 101~150개: 1,600원\n• 151~200개: 2,500원\n• 201~1000개: 3,500원\n\n※ 모든 계정 스킨/레벨/티어 랜덤 | 1,000원 이하 교환 불가";
  }

  // 6. 가격 문의 (한국)
  if (msg.includes("한국") || msg.includes("한섭") || msg.includes("kr") || msg.includes("가격") || msg.includes("얼마")) {
    return "【한국 서버 랜덤 계정 가격표】\n• 1~10개: 900원\n• 11~20개: 2,100원\n• 21~30개: 3,000원\n• 31~40개: 3,800원\n• 41~50개: 4,800원\n• 61~100개: 6,500원\n• 101~150개: 8,000원\n• 151~200개: 9,500원\n• 201~1000개: 9,900원\n\n※ 모든 계정 스킨/레벨/티어 랜덤 | 1,000원 이하 교환 불가";
  }

  // 7. 욕설
  if (msg.includes("시발") || msg.includes("씨발") || msg.includes("병신") || msg.includes("새끼")) {
    return "원활한 상담을 위해 욕설 및 폭언은 삼가주시기 바랍니다. 지속적인 욕설 시 이용약관에 따라 상담이 즉시 종료될 수 있습니다.";
  }

  // 8. 기본 안내
  return "안녕하세요! 발로란트 랜덤 계정 자판기 고객센터입니다.\n어떤 문의이신가요? (구매 가격 / 충전 / 불량 및 교환 / 파트너 문의 등)";
}

client.on("ready", () => {
  console.log(`Bot logged in as ${client.user.tag}`);
});

// 손님이 글을 쓰면 0.1초 만에 감지해서 즉시 답장!
client.on("messageCreate", async (message) => {
  // 봇 본인이 쓴 글 무시
  if (message.author.bot) return;

  // 티켓 채널이거나 특정 채널에서만 동작 (자유채팅 방지)
  // 채널 이름에 ticket, 티켓, 실험 등이 들어있을 때만 답장
  const chName = message.channel.name?.toLowerCase() || "";
  const isTicket = chName.includes("ticket") || chName.includes("티켓") || chName.includes("실험");

  if (!isTicket) return; // 일반 자유채팅이면 반응 안 함

  try {
    // 손님이 타이핑 치는 중 표시
    await message.channel.sendTyping();

    const reply = await getReply(message.content);
    if (reply) {
      await message.reply(reply);
    }
  } catch (err) {
    console.error("답장 에러:", err);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
