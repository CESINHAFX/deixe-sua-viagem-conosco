"""train_with_embeddings.py
Exemplo simples: extrai embeddings e labels da tabela `documents` e treina um classificador LogisticRegression.
Requisitos: scikit-learn, pandas, psycopg[binary]

Uso:
  python scripts/train_with_embeddings.py

Observação: o script assume que `metadata->>'label'` existe para linhas usadas no treino.
"""
import os
import psycopg2
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report


def get_conn():
    return psycopg2.connect(
        host=os.getenv("PGHOST", "localhost"),
        port=os.getenv("PGPORT", "5432"),
        user=os.getenv("PGUSER", "postgres"),
        password=os.getenv("PGPASSWORD", "postgres"),
        dbname=os.getenv("PGDATABASE", "postgres"),
    )


def fetch_embeddings_and_labels():
    conn = get_conn()
    cur = conn.cursor()
    # Seleciona linhas que têm label no metadata
    cur.execute("SELECT id, text, metadata->>'label' as label, embedding FROM documents WHERE metadata ? 'label'")
    rows = cur.fetchall()
    cur.close()
    conn.close()

    data = []
    labels = []
    ids = []
    for r in rows:
        _id, text, label, embedding = r
        if label is None:
            continue
        ids.append(_id)
        labels.append(label)
        data.append(embedding)

    X = np.array(data)
    y = np.array(labels)
    return X, y


def main():
    X, y = fetch_embeddings_and_labels()
    if len(X) == 0:
        raise SystemExit("Nenhum dado com label encontrado na tabela 'documents'. Rode o ingest_embeddings com um CSV que tenha labels.")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print(f"Treinando modelo com {len(X_train)} amostras...")
    clf = LogisticRegression(max_iter=1000)
    clf.fit(X_train, y_train)

    preds = clf.predict(X_test)
    print("Acurácia:", accuracy_score(y_test, preds))
    print(classification_report(y_test, preds))

    # Salvar o modelo se quiser
    try:
        import joblib
        joblib.dump(clf, 'scripts/embedding_classifier.pkl')
        print('Modelo salvo em scripts/embedding_classifier.pkl')
    except Exception:
        pass

if __name__ == '__main__':
    main()
