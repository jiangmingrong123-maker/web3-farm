#!/usr/bin/env python3
"""Generate filled PayPal LOA for YONGDONG ENERGY INDUSTRIAL LIMITED."""

from fpdf import FPDF
from pathlib import Path

FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
OUT = Path(__file__).resolve().parents[1] / "docs" / "YONGDONG-PayPal-LOA-filled.pdf"


class LOAPDF(FPDF):
    def footer(self):
        self.set_y(-15)
        self.set_font("hei", "", 8)
        self.cell(0, 10, f"Page {self.page_no()}/{{nb}}", align="C")


def main() -> None:
    pdf = LOAPDF()
    pdf.alias_nb_pages()
    pdf.add_font("hei", "", FONT)
    pdf.add_font("hei", "B", FONT)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()
    pdf.set_font("hei", "", 11)

    w = pdf.w - pdf.l_margin - pdf.r_margin

    pdf.set_font("hei", "B", 14)
    pdf.cell(w, 10, "授權書 (Letter of Authorization)", ln=True)
    pdf.ln(4)

    pdf.set_font("hei", "", 10)
    pdf.multi_cell(
        w,
        5,
        "此信函須由獲正式授權代表法律實體簽署的人士簽署。請以大寫字母填寫。",
    )
    pdf.ln(4)

    pdf.set_font("hei", "B", 11)
    pdf.cell(w, 7, "致：PayPal Hong Kong Limited", ln=True)
    pdf.set_font("hei", "", 10)
    pdf.multi_cell(w, 5, "香港灣仔港灣道 18 號\n中環廣場 15 樓 1506-07 室")
    pdf.ln(6)

    pdf.set_font("hei", "B", 11)
    pdf.cell(40, 7, "日期 Date:")
    pdf.set_font("hei", "", 11)
    pdf.cell(w - 40, 7, "03 / 07 / 2026", ln=True)
    pdf.ln(4)

    pdf.set_font("hei", "", 11)
    pdf.cell(w, 7, "敬啟者：", ln=True)
    pdf.ln(2)

    body = (
        "YONGDONG ENERGY INDUSTRIAL LIMITED（永動能實業有限公司）（「法律實體」）\n\n"
        "登記號碼 Business Registration Number：75852135\n\n"
        "公司授權人 Authorized Signatory：JIANG MINGRONG（蔣明榮）\n\n"
        "公司授權人職位 Position：Director（董事）\n\n"
        "確認授權以下個人（「獲授權人士」）代表本法律實體處理與本法律實體的 "
        "PayPal 商業帳戶有關的所有事項，所指帳戶登記為以下電郵地址：\n\n"
        "jiangmingrong123@gmail.com\n\n"
        "獲授權人士資料 Authorized Person："
    )
    pdf.multi_cell(w, 6, body)
    pdf.ln(2)

    col_w = w / 3
    pdf.set_font("hei", "B", 10)
    pdf.cell(col_w, 8, "姓名 Name", border=1)
    pdf.cell(col_w, 8, "職位 Position", border=1)
    pdf.cell(col_w, 8, "身份證/護照號碼 ID No.", border=1, ln=True)

    pdf.set_font("hei", "", 10)
    pdf.cell(col_w, 10, "JIANG MINGRONG", border=1)
    pdf.cell(col_w, 10, "Director", border=1)
    pdf.cell(col_w, 10, "（請手寫填入）", border=1, ln=True)
    pdf.ln(6)

    clauses = (
        "除非本法律實體通知 PayPal 已終止對指定獲授權人士的授權，否則以上確認的授權會持續生效。"
        "在允許以上列為獲授權人士的個人使用本法律實體的 PayPal 帳戶前，如對這些人士作出任何變更，"
        "本法律實體會通知 PayPal。本法律實體進一步同意並指示 PayPal 按需要與以上所列獲授權人士商討，"
        "並同意 PayPal 可出於客戶服務和支援的目的向獲授權人士披露本法律實體的機密帳戶資料。\n\n"
        "本法律實體亦在此同意，如直接或間接因 PayPal 遵守 (a) 本法律實體在此的指示或 "
        "(b) 由獲授權人士代表本法律實體就本法律實體的 PayPal 商業帳戶發出的任何指示，"
        "或因與之相關的事宜，而令 PayPal 面對、蒙受或招致任何訴訟、索償、法律程序、損失、"
        "損害、成本和開支，本法律實體會賠償 PayPal，並使 PayPal 免受所有損害。"
    )
    pdf.set_font("hei", "", 9)
    pdf.multi_cell(w, 5, clauses)
    pdf.ln(10)

    pdf.set_font("hei", "", 11)
    pdf.cell(w, 8, "公司授權人簽名 Signature: _______________________________", ln=True)
    pdf.ln(2)
    pdf.cell(w, 8, "姓名 Name: JIANG MINGRONG（蔣明榮）", ln=True)
    pdf.ln(2)
    pdf.cell(w, 8, "職位 Title: Director（董事）", ln=True)
    pdf.ln(2)
    pdf.cell(w, 8, "日期 Date: 03 / 07 / 2026", ln=True)
    pdf.ln(4)
    pdf.cell(w, 8, "公司印章 Company Chop: _______________________________（如適用）", ln=True)
    pdf.ln(8)

    pdf.set_font("hei", "", 8)
    pdf.multi_cell(
        w,
        4,
        "公司地址 Company Address:\n"
        "UNIT 89, 3/F, YAU LEE CENTRE, NO. 45 HOI YUEN ROAD,\n"
        "KWUN TONG, KOWLOON, HONG KONG\n\n"
        "注意：請打印後在「身份證/護照號碼」欄手寫填入證件號碼，"
        "並由董事蔣明榮親筆簽名。如有公司章請蓋章。",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(OUT)


if __name__ == "__main__":
    main()
