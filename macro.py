# Kurulum: pip install pydirectinput

import json
import time
import ctypes
import sys

def is_admin():
    """Scriptin yönetici haklarıyla çalışıp çalışmadığını kontrol eder."""
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

def run_automation():
    # Yönetici izni kontrolü
    if not is_admin():
        print("Hata: Bu scriptin düzgün çalışması için Yönetici olarak çalıştırılması gerekir.")
        return

    print("Otomasyon başlatılıyor... (Durdurmak için CTRL+C)")
    
    # Verilen JSON verisi
    json_data = """
    [
        {"id":"oqidvlre7","type":"KEY_PRESS","value":"z"},
        {"id":"vxqoiyk8n","type":"KEY_PRESS","value":"r"},
        {"id":"ezb44jdh2","type":"KEY_PRESS","value":"3"},
        {"id":"rdejg9b5u","type":"KEY_PRESS","value":"r"},
        {"id":"ltbhyozg3","type":"KEY_PRESS","value":"r"},
        {"id":"qmiyvus0i","type":"KEY_PRESS","value":"r"}
    ]
    """

    try:
        # JSON verisini Python listesine çevirme
        actions = json.loads(json_data)
        
        # pydirectinput varsayılan gecikme ayarı
        pydirectinput.PAUSE = 0.1

        # Eylemleri sırasıyla gerçekleştirme
        for action in actions:
            if action.get("type") == "KEY_PRESS":
                key_char = action.get("value")
                if key_char:
                    print(f"Tuşa basılıyor: {key_char}")
                    # Basit tuş basımı (press = keyDown + keyUp)
                    pydirectinput.press(key_char)
                    
                    # İşlemler arası sabit bekleme süresi
                    time.sleep(0.2)

        print("İşlem tamamlandı.")

    except json.JSONDecodeError:
        print("Hata: JSON verisi işlenemedi.")
    except Exception as e:
        print(f"Beklenmeyen bir hata oluştu: {e}")

if __name__ == "__main__":
    run_automation()