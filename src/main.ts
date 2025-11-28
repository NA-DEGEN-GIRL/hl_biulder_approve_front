import './style.css'
import * as hl from "@nktkas/hyperliquid";
import { createWalletClient, custom, isAddress, getAddress } from "viem"; // [변경] isAddress, getAddress import 유지/추가
import { arbitrum } from "viem/chains";
import { BUILDER_LIST, type BuilderEntry } from "./builders"; // [추가] 빌더 목록 import

// [추가] 주소 체크섬 유틸
function toChecksum(addr: string): `0x${string}` {
  return getAddress(addr as `0x${string}`) as `0x${string}`;
}

// [추가] 전역 상태: walletClient, 주소 보관
let walletClientRef: ReturnType<typeof createWalletClient> | null = null;
let userAddress: `0x${string}` | null = null;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Hyperliquid Builder Fee Approve</h1>

    <!-- 지갑 연결 -->
    <button id="connectBtn" style="padding: 10px 20px; font-size: 16px;">
      지갑 연결하기
    </button>

    <!-- 상태/잔고 -->
    <div id="status" style="margin-top: 20px; white-space: pre-line;">대기 중...</div>
    <div id="balance" style="font-weight: bold; margin-top: 10px;"></div>

    <hr style="margin: 24px 0;" />

    <!-- [추가] Builder 선택/입력 UI -->
    <h2>Builder Fee 승인</h2>
    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
      <!-- [추가] 셀렉트 박스: 목록에서 선택 -->
      <select id="builderSelect" style="min-width: 280px; padding: 8px;">
        <!-- 옵션은 스크립트에서 주입 -->
      </select>

      <!-- [변경] 주소 직접 입력 필드(선택 시 자동 채움/잠금) -->
      <input id="builderAddress" placeholder="Builder 주소 (0x...)" style="width: 420px; padding: 8px;" />

      <input id="builderFee" placeholder="최대 수수료 % (예: 0.05)" style="width: 200px; padding: 8px;" />
      <button id="approveBtn" style="padding: 8px 16px;">Builder Fee 승인</button>
    </div>
    <div id="approveResult" style="margin-top: 12px; color: #0b7;"></div>
  </div>
`

const connectBtn = document.querySelector<HTMLButtonElement>('#connectBtn')!;
const statusDiv = document.querySelector<HTMLDivElement>('#status')!;
const balanceDiv = document.querySelector<HTMLDivElement>('#balance')!;

// [추가] 승인 섹션 엘리먼트
const approveBtn = document.querySelector<HTMLButtonElement>('#approveBtn')!;
const approveResultDiv = document.querySelector<HTMLDivElement>('#approveResult')!;
const builderSelect = document.querySelector<HTMLSelectElement>('#builderSelect')!;
const builderAddressInput = document.querySelector<HTMLInputElement>('#builderAddress')!;
const builderFeeInput = document.querySelector<HTMLInputElement>('#builderFee')!;

// [추가] 빌더 목록 초기화: 유효한 주소만 필터링하여 옵션 구성
function initBuilderSelect(list: BuilderEntry[]) {
  // 1) 유효성 검증 + 체크섬 정규화
  const normalized = list
    .filter((x) => isAddress(x.address))
    .map((x) => ({ name: x.name, address: toChecksum(x.address) }))
    // 동일 주소 중복 제거(마지막 항목 우선)
    .reduce<Map<string, { name: string; address: `0x${string}` }>>((map, cur) => {
      map.set(cur.address, cur);
      return map;
    }, new Map());

  // 2) 옵션 렌더링
  const options: string[] = [];
  options.push(`<option value="__manual__">직접 입력 (수동)</option>`);
  for (const { name, address } of normalized.values()) {
    options.push(`<option value="${address}">${name} — ${address}</option>`);
  }
  builderSelect.innerHTML = options.join("");

  // 3) 기본 상태: 수동 입력
  builderSelect.value = "__manual__";
  builderAddressInput.value = "";
  builderAddressInput.readOnly = false; // 수동 입력 가능
}

// [추가] 셀렉트 변경 시 입력창 동기화
builderSelect.addEventListener('change', () => {
  const v = builderSelect.value;
  if (v === "__manual__") {
    builderAddressInput.readOnly = false;
    // 수동으로 새로 입력 가능. 기존 값 유지
  } else {
    builderAddressInput.value = v; // 체크섬 주소 자동 입력
    builderAddressInput.readOnly = true; // 선택 시 편집 잠금
  }
});

// [추가] 페이지 로드 시 빌더 목록 옵션 주입
initBuilderSelect(BUILDER_LIST);

connectBtn.addEventListener('click', async () => {
  try {
    if (typeof window.ethereum === 'undefined') {
      alert("지갑이 설치되어 있지 않음");
      return;
    }

    statusDiv.innerText = "지갑 연결 중...";

    const walletClient = createWalletClient({
      chain: arbitrum,
      transport: custom(window.ethereum)
    });

    const addresses = await walletClient.requestAddresses();
    const address = toChecksum(addresses[0] as `0x${string}`); // [변경] 체크섬 정규화

    if (!address) {
      statusDiv.innerText = "지갑 주소를 가져오지 못함 (메타마스크 잠금 해제 확인)";
      return;
    }

    walletClientRef = walletClient;
    userAddress = address;

    const transport = new hl.HttpTransport(); 
    const infoClient = new hl.InfoClient({ transport });

    const mids = await infoClient.allMids();
    statusDiv.innerText += "\n잔고 조회 중...";

    const userState = await infoClient.clearinghouseState({ user: address });
    const usdcBalance = userState?.marginSummary?.accountValue || "0";
    balanceDiv.innerText = `USDC 잔고: $${usdcBalance}`;
    statusDiv.innerText = `지갑 연결 완료: ${address}`;

  } catch (error) {
    console.error(error);
    statusDiv.innerText = `에러 발생: ${error instanceof Error ? error.message : String(error)}`;
  }
});

// [유지] viem WalletClient를 ExchangeClient가 사용 가능한 형태로 래핑
function buildViemWalletForHL({
  walletClient,
  address,
}: {
  walletClient: any;
  address: `0x${string}`;
}) {
  return {
    address, // 체크섬 주소
    signMessage: (args: { message: string | { raw: string } }) =>
      walletClient.signMessage({ account: address, ...args }),
    signTypedData: (args: any) =>
      walletClient.signTypedData({ account: address, ...args }),
  };
}

// [변경] Builder Fee 승인 핸들러: 셀렉트/수동 입력 병행 지원
approveBtn.addEventListener('click', async () => {
  try {
    approveResultDiv.style.color = '#0b7';
    approveResultDiv.innerText = "";

    if (!walletClientRef || !userAddress) {
      alert("먼저 지갑을 연결하세요.");
      return;
    }

    // 1) 선택 우선, 없으면 수동 입력 사용
    const selected = builderSelect.value;
    const builderRaw = selected !== "__manual__"
      ? selected
      : (builderAddressInput.value || '').trim();

    // 2) 주소 검증
    if (!isAddress(builderRaw)) {
      approveResultDiv.style.color = '#c00';
      approveResultDiv.innerText = "올바른 0x 주소를 입력하거나 목록에서 선택하세요.";
      return;
    }
    const builder = toChecksum(builderRaw);

    // 3) 수수료 검증
    const feeStr = (builderFeeInput.value || '').trim();
    const feeNum = Number(feeStr);
    if (!Number.isFinite(feeNum) || feeNum <= 0) {
      approveResultDiv.style.color = '#c00';
      approveResultDiv.innerText = "수수료는 0보다 큰 숫자(%)로 입력하세요. 예: 0.05";
      return;
    }
    if (feeNum > 1.0) {
      approveResultDiv.style.color = '#c00';
      approveResultDiv.innerText = "최대 수수료%는 1.00% 이하여야 합니다.";
      return;
    }
    const maxFeeRate = `${feeNum}%`; // 예: "0.05%"

    // 4) 클라이언트 구성
    const transport = new hl.HttpTransport();
    const viemWallet = buildViemWalletForHL({ walletClient: walletClientRef, address: userAddress });
    const exchangeClient = new hl.ExchangeClient({ wallet: viemWallet, transport });
    const infoClient = new hl.InfoClient({ transport });

    approveResultDiv.innerText = "Builder Fee 승인 트랜잭션 서명/전송 중... (지갑 확인)";

    // 5) 승인 호출
    const res = await exchangeClient.approveBuilderFee({ builder, maxFeeRate });
    console.log("approveBuilderFee 결과:", res);

    // 6) 승인 상태 확인
    const approved = await infoClient.maxBuilderFee({ user: userAddress!, builder });
    const maxApproved = approved?.maxBuilderFee ?? "0";
    approveResultDiv.style.color = '#0b7';
    approveResultDiv.innerText =
      `승인 완료. builder=${builder}\n최대 수수료(저장값): ${maxApproved}`;

  } catch (error) {
    console.error(error);
    approveResultDiv.style.color = '#c00';
    approveResultDiv.innerText = `승인 에러: ${error instanceof Error ? error.message : String(error)}`;
  }
});