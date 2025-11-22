# Scripts para demo de embeddings + ML

Passo a passo (via terminal/prompt):

1. Instalar dependências (recomendado dentro do Dev Container):

```powershell
python -m pip install --upgrade pip
pip install psycopg[binary] pgvector sentence-transformers pandas scikit-learn joblib
```

2. Configurar variáveis de ambiente (exemplo):

```powershell
$env:PGHOST = "localhost"
$env:PGPORT = "5432"
$env:PGUSER = "postgres"
$env:PGPASSWORD = "postgres"
$env:PGDATABASE = "postgres"
# opcional: $env:EMBEDDING_DIM = "384"
```

3. Criar tabela com pgvector:

```powershell
python scripts/create_table.py
```

4. Ingerir dados de exemplo e gerar embeddings:

```powershell
python scripts/ingest_embeddings.py --source scripts/sample_data.csv
```

5. Treinar um classificador com os embeddings:

```powershell
python scripts/train_with_embeddings.py
```

Notas:
- O `EMBEDDING_DIM` padrão está em 384 (modelo `all-MiniLM-L6-v2`). Ajuste se usar embeddings maiores (ex.: 1536 para modelos OpenAI/Azure).
- Se preferir gerar embeddings pela API (OpenAI/Azure), substitua a parte de `model.encode(...)` no `ingest_embeddings.py` por chamadas à API e normalize o vetor retornado.
- Para consultas aproximadas por similaridade, use SQL com `ORDER BY embedding <-> '[...vector...]' LIMIT k`.
