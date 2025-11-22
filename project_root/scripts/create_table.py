"""create_table.py
Cria extensão pgvector e a tabela `documents` com coluna `embedding vector(dim)`.
Configurar variáveis de ambiente: PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
"""
import os
import psycopg2

EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "384"))  # ajuste se usar outro modelo

def main():
    conn = psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
        dbname=os.getenv("PGDATABASE", "postgres"),
    )
    conn.autocommit = True
    cur = conn.cursor()

    print("Criando extensão pgvector (se não existir)...")
    cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")

    print(f"Criando tabela documents com embedding dimension {EMBEDDING_DIM}...")
    cur.execute(f"""
    CREATE TABLE IF NOT EXISTS documents (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        metadata JSONB,
        embedding VECTOR({EMBEDDING_DIM})
    );
    """)

    print("Criando index ivfflat para acelerar similaridade (requer ANALYZE)")
    cur.execute("CREATE INDEX IF NOT EXISTS idx_documents_embedding ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);")

    cur.close()
    conn.close()
    print("Pronto. Execute ANALYZE documents; no DB para construir o índice quando houver dados.")

if __name__ == '__main__':
    main()
