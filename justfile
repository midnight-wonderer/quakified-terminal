preview:
    cd previewer && poetry run python main.py

package:
    rm -f quakified-terminal.kwinscript
    zip -r quakified-terminal.kwinscript metadata.json README.md LICENSE.md contents/
