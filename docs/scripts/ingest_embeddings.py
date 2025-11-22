"""ingest_embeddings.py
Ingesta exemplos do CSV `sample_data.csv` (text,label) e calcula embeddings usando sentence-transformers.
Insere colunas `text`, `metadata` (com label) e `embedding` na tabela `documents`.

Uso (no terminal):
  python scripts/ingest_embeddings.py --db_connenv

Requer:
  pip install psycopg[binary] pgvector sentence-transformers pandas

Configurar env vars: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
"""
import os
import argparse
import psycopg2
import pandas as pd
from sentence_transformers import SentenceTransformer

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")


def get_conn():
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
        dbname=os.getenv("PGDATABASE", "postgres"),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="scripts/sample_data.csv", help="CSV com colunas 'text' e 'label'")
    args = parser.parse_args()

    print(f"Carregando modelo de embeddings: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    df = pd.read_csv(args.source)
    if 'text' not in df.columns:
        raise SystemExit("CSV precisa da coluna 'text'")

    texts = df['text'].astype(str).tolist()
    print(f"Gerando embeddings para {len(texts)} textos...")
    embeddings = model.encode(texts, show_progress_bar=True)

    conn = get_conn()
    cur = conn.cursor()

    for i, row in df.iterrows():
        text = str(row['text'])
        label = row.get('label', None)
        metadata = {'label': label} if pd.notna(label) else None
        emb = embeddings[i].tolist()

        cur.execute(
            "INSERT INTO documents (text, metadata, embedding) VALUES (%s, %s, %s)",
            (text, psycopg2.extras.Json(metadata) if metadata is not None else None, emb)
        )

    conn.commit()
    cur.close()
    conn.close()

    print("Ingestão concluída.")

if __name__ == '__main__':
    # Import extra here to avoid top-level import error if not installed yet
    import psycopg2.extras
    main()
