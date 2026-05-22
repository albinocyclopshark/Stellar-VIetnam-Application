import * as StellarSdk from "@stellar/stellar-sdk";
import { isConnected, requestAccess, getAddress, signTransaction } from "@stellar/freighter-api";

// Đèn tín hiệu 1: Báo hiệu file JS đã được HTML đọc thành công
console.log("🚀 File main.js đã được nạp thành công!");

const CONTRACT_ID = "CDU6WR3BQVV5ILB5G4HWRVTNDCXGKFJWJGAE34SEUHQLQMYOSVSRDFYY"; 
const RPC_URL = "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

async function connectWallet() {
  console.log("⏳ Đang kiểm tra trạng thái ví Freighter...");
  if (!(await isConnected())) {
      console.error("❌ Không tìm thấy ví Freighter trên trình duyệt!");
      alert("Cài đặt hoặc Mở khóa ví Freighter!");
      return null;
  }
  
  // DÒNG QUAN TRỌNG NHẤT: Bật popup xin quyền kết nối của ví
  console.log("🔓 Đang gọi cửa sổ popup xin quyền từ ví...");
  await requestAccess(); 
  
  console.log("✅ Đã cấp quyền, đang xin cấp địa chỉ...");
  const { address } = await getAddress();
  console.log("🎉 Thành công! Địa chỉ ví của bạn là:", address);
  
  // Chặn lỗi nếu người dùng bấm "Reject" (Từ chối) trên ví
  if (!address) {
      alert("Bạn chưa cấp quyền kết nối cho trang web này!");
      return null;
  }
  
  document.getElementById("wallet-address").textContent = address.substring(0, 4) + "..." + address.slice(-4);
  return address;
}

// Kiểm tra xem code có tìm thấy nút bấm trên HTML không
const connectBtn = document.getElementById('connectBtn');
if (connectBtn) {
    console.log("🔘 Đã tìm thấy nút Kết nối ví trên giao diện!");
} else {
    console.error("❌ Lỗi: Không tìm thấy nút nào có id là 'connectBtn'");
}

let isWalletActive = false;

// Bắt sự kiện click
connectBtn.addEventListener('click', async () => {
    console.log("👆 Bạn vừa bấm vào nút Kết nối!");
    try {
        const address = await connectWallet();
        if (address) {
            isWalletActive = true;
            document.getElementById('connectBtn').style.display = 'none';
            document.getElementById('walletInfo').style.display = 'flex';
        }
    } catch (error) {
        console.error("❌ Có lỗi xảy ra trong quá trình gọi ví:", error);
    }
});

// Sự kiện cho input và submit (mình giữ nguyên logic)
document.getElementById('imageLink').addEventListener('input', (e) => {
    if (isWalletActive && e.target.value.length > 5) {
        document.getElementById('submitBtn').disabled = false;
    } else {
        document.getElementById('submitBtn').disabled = true;
    }
});

// HÀM GỌI CONTRACT ĐÃ ĐƯỢC CẬP NHẬT CÚ PHÁP MỚI NHẤT
async function callContract(funcName, ...args) {
    const address = await connectWallet();
    
    // Đã đổi SorobanRpc thành rpc
    const server = new StellarSdk.rpc.Server(RPC_URL); 
    const account = await server.getAccount(address);
    const contract = new StellarSdk.Contract(CONTRACT_ID);
  
    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(contract.call(funcName, ...args))
      .setTimeout(30)
      .build();
  
    const prepared = await server.prepareTransaction(tx);
    const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
      networkPassphrase: NETWORK_PASSPHRASE,
    });
  
    const signed = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
    const result = await server.sendTransaction(signed);
    return result;
}

document.getElementById('submitBtn').addEventListener('click', async () => {
    // ... (Giữ nguyên logic hàm submitBtn của bạn)
    console.log("👆 Đã bấm nút Nộp dữ liệu");
    const linkValue = document.getElementById('imageLink').value.trim();
    const btn = document.getElementById('submitBtn');
    
    btn.disabled = true;
    btn.textContent = "Vui lòng xác nhận trên ví...";
    document.getElementById('resultArea').style.display = 'none';

    try {
        const arg1_address = await connectWallet(); 
        const scVal_contributor = StellarSdk.nativeToScVal(arg1_address, { type: "address" });
        const scVal_link = StellarSdk.nativeToScVal(linkValue, { type: "string" });

        console.log("Đang gửi giao dịch lên mạng lưới...");
        const result = await callContract("submit_data", scVal_contributor, scVal_link);

        document.getElementById('resultArea').style.display = 'block';
        document.getElementById('txHashDisplay').textContent = result.hash;
        
        btn.textContent = "Nộp dữ liệu & Nhận 1 XLM";
        document.getElementById('imageLink').value = '';
    } catch (error) {
        console.error("Giao dịch thất bại:", error);
        alert("Giao dịch bị từ chối hoặc lỗi mạng!");
        btn.textContent = "Thử lại";
        btn.disabled = false;
    }
});