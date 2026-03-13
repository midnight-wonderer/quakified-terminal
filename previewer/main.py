import os
from PyQt6 import QtWidgets, uic
import sys

app = QtWidgets.QApplication(sys.argv)
ui_path = os.path.join(os.path.dirname(__file__), "../contents/ui/config.ui")
window = uic.loadUi(ui_path)
window.show()
sys.exit(app.exec())

