import urllib.request
import urllib.error
import json
import threading
import time

# Konfigurasi
URL = "http://localhost:8000/api/buy"
JUMLAH_BOT = 6 # Ubah jika ingin lebih banyak bot

def buy_ticket(bot_id, start_event):
    # Tunggu sampai sinyal bendera (event) diangkat agar semua jalan persis bersamaan
    start_event.wait() 
    
    data = json.dumps({"user_id": f"Bot-{bot_id}"}).encode('utf-8')
    req = urllib.request.Request(URL, data=data, headers={'Content-Type': 'application/json'})
    
    try:
        # Tembak API
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        print(f"✅ [Bot-{bot_id}] SUKSES - Sisa Tiket API: {result.get('ticket_remaining')}")
    except urllib.error.HTTPError as e:
        # Kalau gagal (misal kehabisan atau dilarang)
        try:
            error_msg = json.loads(e.read().decode('utf-8')).get('detail', 'Gagal')
        except:
            error_msg = "Error dari server"
        print(f"❌ [Bot-{bot_id}] GAGAL - {error_msg}")
    except Exception as e:
        print(f"⚠️ [Bot-{bot_id}] ERROR NETWORK - {str(e)}")

def run_bots(num_bots):
    print(f"🤖 Menyiapkan {num_bots} bot penyerang...")
    
    # Event ini seperti pistol aba-aba lomba lari
    start_event = threading.Event()
    threads = []
    
    for i in range(num_bots):
        t = threading.Thread(target=buy_ticket, args=(i+1, start_event))
        t.start()
        threads.append(t)
        
    print("⏳ Menunggu semua bot bersiap...")
    time.sleep(1) # Beri waktu thread untuk siap di garis start
    
    print("\n🚀 3... 2... 1... SERANG BERSAMAAN!!!")
    # Angkat bendera (Set event) -> Semua bot lari (tembak API) di milidetik yang sama
    start_event.set() 
    
    # Tunggu semua bot selesai lari
    for t in threads:
        t.join()
        
    print("\n🏁 Simulasi Bot Selesai.")
    print("Silakan cek halaman Admin Panel untuk melihat Logs-nya!")

if __name__ == "__main__":
    print("=======================================")
    print("   SCRIPT BOT TESTER - TICKET WAR      ")
    print("=======================================")
    print("⚠️ PASTIKAN STATUS WAR SUDAH 'AKTIF' DI ADMIN PANEL SEBELUM LANJUT!")
    input("Tekan [ENTER] jika WAR sudah AKTIF...")
    
    run_bots(JUMLAH_BOT)
