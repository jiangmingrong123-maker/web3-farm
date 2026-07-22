#!/usr/bin/env python3
"""Generate single-page PayPal LOA for YONGDONG ENERGY INDUSTRIAL LIMITED."""

from fpdf import FPDF
from fpdf.enums import XPos, YPos
from pathlib import Path

FONT = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
OUT = Path(__file__).resolve().parents[1] / "docs" / "YONGDONG-PayPal-LOA-filled.pdf"


def main() -> None:
    pdf = FPDF()
    pdf.add_font("hei", "", FONT)
    pdf.add_font("hei", "B", FONT)
    pdf.set_margins(18, 15, 18)
    pdf.set_auto_page_break(auto=False)
    pdf.add_page()
    pdf.set_font("hei", "", 9)

    w = pdf.w - pdf.l_margin - pdf.r_margin

    pdf.set_font("hei", "B", 12)
    pdf.cell(w, 7, "授權書 (Letter of Authorization)", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("hei", "", 8)
    pdf.cell(w, 4, "此信函須由獲正式授權代表法律實體簽署的人士簽署", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(3)

    pdf.set_font("hei", "B", 9)
    pdf.cell(w, 5, "致：PayPal Hong Kong Limited", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.set_font("hei", "", 8)
    pdf.cell(w, 4, "香港灣仔港灣道 18 號  中環廣場 15 樓 1506-07 室", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

    pdf.set_font("hei", "B", 9)
    pdf.cell(22, 5, "日期：")
    pdf.set_font("hei", "", 9)
    pdf.cell(w - 22, 5, "03 / 07 / 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)

    pdf.set_font("hei", "", 9)
    pdf.cell(w, 5, "敬啟者：", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(1)

    lines = [
        "YONGDONG ENERGY INDUSTRIAL LIMITED（永動能實業有限公司）（「法律實體」）",
        "",
        "登記號碼：75852135",
        "",
        "公司授權人：JIANG MINGRONG（江铭荣）",
        "",
        "公司授權人職位：Director（董事）",
        "",
        "確認授權以下個人（「獲授權人士」）代表本法律實體處理與本法律實體的 PayPal 商業帳戶",
        "有關的所有事項，所指帳戶登記為以下電郵地址：",
        "",
        "jiangmingrong123@gmail.com",
    ]
    for line in lines:
        pdf.cell(w, 4.5, line, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(2)
    pdf.set_font("hei", "B", 8)
    col = w / 3
    pdf.cell(col, 6, "獲授權人士姓名", border=1)
    pdf.cell(col, 6, "在法律實體中的職位", border=1)
    pdf.cell(col, 6, "身份證/護照號碼", border=1, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.set_font("hei", "", 9)
    pdf.cell(col, 12, "JIANG MINGRONG", border=1)
    pdf.cell(col, 12, "Director", border=1)
    pdf.cell(col, 12, "", border=1, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    pdf.ln(3)
    pdf.set_font("hei", "", 7.5)
    pdf.multi_cell(
        w,
        3.8,
        "除非本法律實體通知 PayPal 已終止對指定獲授權人士的授權，否則以上確認的授權會持續生效。"
        "在允許以上列為獲授權人士的個人使用本法律實體的 PayPal 帳戶前，如對這些人士作出任何變更，"
        "本法律實體會通知 PayPal。本法律實體進一步同意並指示 PayPal 按需要與以上所列獲授權人士商討，"
        "並同意 PayPal 可出於客戶服務和支援的目的向獲授權人士披露本法律實體的機密帳戶資料。"
        "本法律實體亦在此同意，如直接或間接因 PayPal 遵守 (a) 本法律實體在此的指示或 "
        "(b) 由獲授權人士代表本法律實體就本法律實體的 PayPal 商業帳戶發出的任何指示，"
        "或因與之相關的事宜，而令 PayPal 面對、蒙受或招致任何訴訟、索償、法律程序、損失、"
        "損害、成本和開支，本法律實體會賠償 PayPal，並使 PayPal 免受所有損害。",
    )
    pdf.ln(4)

    pdf.set_font("hei", "", 9)
    pdf.cell(w, 5, "公司授權人簽名：", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(10)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 80, pdf.get_y())
    pdf.ln(3)

    pdf.cell(w, 5, "姓名：JIANG MINGRONG（江铭荣）", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.cell(w, 5, "職位：Director（董事）", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.cell(w, 5, "日期：03 / 07 / 2026", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(2)
    pdf.cell(w, 5, "公司印章：（如適用）", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.ln(10)
    pdf.line(pdf.l_margin, pdf.get_y(), pdf.l_margin + 50, pdf.get_y())
    pdf.ln(3)

    pdf.set_font("hei", "", 7.5)
    pdf.multi_cell(
        w,
        3.5,
        "公司地址：UNIT 89, 3/F, YAU LEE CENTRE, NO. 45 HOI YUEN ROAD, "
        "KWUN TONG, KOWLOON, HONG KONG",
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"pages: {pdf.page_no()}")
    print(OUT)


if __name__ == "__main__":
    main()
