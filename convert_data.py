import zipfile
import xml.etree.ElementTree as ET
import json
import os

ods_path = r"c:\Users\User\Desktop\turtlesoup\海龜湯題目.ods"
json_output_path = r"c:\Users\User\Desktop\turtlesoup\questions.json"

if not os.path.exists(ods_path):
    print(f"Error: ODS file not found at {ods_path}")
    exit(1)

with zipfile.ZipFile(ods_path) as z:
    content_xml = z.read("content.xml")

root = ET.fromstring(content_xml)

namespaces = {
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0'
}

tables = root.findall('.//table:table', namespaces)
if not tables:
    print("Error: No tables found in ODS file.")
    exit(1)

sheet1_table = tables[0]
rows = sheet1_table.findall('.//table:table-row', namespaces)
parsed_questions = []

# 1. 插入欄位說明備註物件到最前方
parsed_questions.append({
    "note": "欄位說明",
    "schema": {
        "title": "簡要標題",
        "description": "湯面，顯示給使用者，提供給使用者解謎的線索",
        "solution": "湯底，使用者回答正確或提前結束遊戲室提供的正確解答，也是AI主持人判斷玩家提問的依據。"
    }
})

# 經典題目資料對照表（作為測試資料）
classic_samples = {
    "1": {
        "description": "一個女孩買了一雙漂亮的新高跟鞋。當晚，她去上班，結果慘死在工作崗位上。為什麼？",
        "solution": "她是馬戲團裡飛刀表演的助手。表演時，她蒙眼站立，飛刀手蒙眼朝她周圍扔刀。平時她穿平底鞋，這天她穿了新買的高跟鞋，導致身高稍微增加。飛刀手仍照平時習慣的高度扔刀，結果飛刀直接刺中她的頭部致死。"
    },
    "2": {
        "description": "男子隨手關了燈，倒頭就睡。隔天醒來，他看了看報紙，痛哭流涕，接著走到陽台一躍而下。為什麼？",
        "solution": "這名男子是一位燈塔看守員。昨晚他回家時隨手把路過的燈關掉，卻沒意識到那是燈塔的指引燈。結果一艘輪船在黑夜中迷失方向，觸礁沉沒，船上所有人遇難。隔天早上他看到報紙新聞後無比自責，於是跳樓自殺。"
    },
    "3": {
        "description": "一隻生物享用了牠人生中最豐盛的最後大餐，隨後便在巨大的滿足中死去了。這是為什麼？",
        "solution": "這隻生物是一隻母蚊子。牠吸飽了人類的血（大餐），因為吸得太飽飛不動，停在人類的手臂上。人類發現後隨手一巴掌，將蚊子拍死（滿足中死去）。"
    }
}

for row_idx, row in enumerate(rows):
    cells = row.findall('.//table:table-cell', namespaces)
    row_data = []
    for cell in cells:
        repeat = cell.get('{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated')
        repeat_count = int(repeat) if repeat else 1
        
        text_elems = cell.findall('.//text:p', namespaces)
        cell_text = "".join([t.text if t.text else "" for t in text_elems]).strip()
        
        if not cell_text and repeat_count > 100:
            repeat_count = 1
            
        for _ in range(repeat_count):
            row_data.append(cell_text)
            
    while row_data and not row_data[-1]:
        row_data.pop()
        
    if not row_data:
        continue
        
    if len(row_data) > 1 and row_data[1] == "題目":
        continue
    if len(row_data) > 0 and row_data[0] == "":
        continue
    if len(row_data) < 2 or not row_data[1]:
        continue
        
    while len(row_data) < 6:
        row_data.append("")
        
    q_id = row_data[0]
    title = row_data[1]
    
    # 預設 description 與 solution 為空
    desc = ""
    sol = row_data[2] # 預設使用簡要說明作為 solution
    
    # 若有經典測試資料則填入
    if q_id in classic_samples:
        desc = classic_samples[q_id]["description"]
        sol = classic_samples[q_id]["solution"]
        
    cat1 = row_data[3]
    cat2 = row_data[4]
    highlight = row_data[5]
    
    parsed_questions.append({
        "id": q_id,
        "title": title,
        "description": desc,
        "solution": sol,
        "category1": cat1,
        "category2": cat2,
        "highlight": highlight
    })

with open(json_output_path, 'w', encoding='utf-8') as f:
    json.dump(parsed_questions, f, ensure_ascii=False, indent=2)

print(f"Successfully converted {len(parsed_questions) - 1} questions to {json_output_path}")
print(f"Metadata note prepended as the first element.")
