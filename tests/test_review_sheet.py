import importlib.util
import tempfile
import unittest
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent


class ReviewSheetTests(unittest.TestCase):
    def test_sheet_covers_all_content(self):
        spec = importlib.util.spec_from_file_location("rs", ROOT / "scripts" / "build_review_sheet.py")
        rs = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(rs)
        import sys
        out = Path(tempfile.mkdtemp()) / "r.xlsx"
        argv, sys.argv = sys.argv, ["x", "--out", str(out)]
        try:
            rs.main()                                   # an absolute --out keeps the repo untouched
        finally:
            sys.argv = argv
        wb = load_workbook(out)
        counts = {s: wb[s].max_row - 1 for s in wb.sheetnames[1:]}
        self.assertEqual(counts["词汇 Kosakata"], 1000)
        self.assertEqual(counts["听力 Mendengar"], 104)          # 68 Q&A + 24 dialogs + 12 passages
        self.assertEqual(counts["阅读 Membaca"], 58)             # 30 short texts + 28 paragraph questions
        self.assertGreater(counts["填空 Isi kata"], 1500)
        ws = wb["词汇 Kosakata"]
        self.assertEqual(ws.cell(row=1, column=10).value.split()[0], "状态")   # reviewer status column
        self.assertTrue(ws.data_validations.dataValidation)


if __name__ == "__main__":
    unittest.main()
