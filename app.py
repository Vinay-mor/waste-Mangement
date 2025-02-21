# backend/app.py
from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from prophet import Prophet
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from statsmodels.tsa.arima.model import ARIMA
import json
from io import StringIO

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictionResponse(BaseModel):
    historical_data: List[Dict]
    predictions: List[Dict]
    metrics: Dict
    feature_importance: List[Dict]

@app.post("/api/validate-csv")
async def validate_csv(file: UploadFile):
    try:
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        required_columns = ['year', 'waste', 'population_growth', 'economic_activity', 'urbanization_rate']
        if not all(col in df.columns for col in required_columns):
            raise HTTPException(status_code=400, detail="Missing required columns")
            
        return {"message": "File validated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/predict", response_model=PredictionResponse)
async def predict(file: UploadFile):
    try:
        # Read and process CSV
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')))
        
        # Preprocess data
        df['ds'] = pd.to_datetime(df['year'], format='%Y')
        df['y'] = df['waste']
        
        # Train Prophet model
        prophet_model = Prophet(yearly_seasonality=True)
        prophet_model.fit(df[['ds', 'y']])
        
        # Generate future dates
        future_dates = prophet_model.make_future_dataframe(periods=15, freq='Y')
        prophet_forecast = prophet_model.predict(future_dates)
        
        # Train LSTM model
        scaler = StandardScaler()
        scaled_data = scaler.fit_transform(df[['waste']])
        
        # Prepare LSTM data
        X, y = [], []
        for i in range(3, len(scaled_data)):
            X.append(scaled_data[i-3:i])
            y.append(scaled_data[i])
        X, y = np.array(X), np.array(y)
        
        # LSTM model
        lstm_model = Sequential([
            LSTM(50, activation='relu', input_shape=(3, 1)),
            Dense(1)
        ])
        lstm_model.compile(optimizer='adam', loss='mse')
        lstm_model.fit(X, y, epochs=100, batch_size=32, verbose=0)
        
        # ARIMA model
        arima_model = ARIMA(df['waste'], order=(1,1,1))
        arima_results = arima_model.fit()
        
        # Generate predictions
        historical_data = df.to_dict('records')
        predictions = []
        
        for i in range(15):
            year = df['year'].max() + i + 1
            predictions.append({
                'year': year,
                'prophet_prediction': prophet_forecast['yhat'].iloc[-(15-i)],
                'lstm_prediction': scaler.inverse_transform([[lstm_model.predict(X[-1:])[-1]]])[0][0],
                'arima_prediction': arima_results.forecast(1)[0]
            })
        
        # Calculate metrics
        metrics = {
            'prophet': {
                'rmse': np.sqrt(((df['waste'] - prophet_forecast['yhat'][:len(df)])** 2).mean()),
                'r2': 1 - (((df['waste'] - prophet_forecast['yhat'][:len(df)]) ** 2).sum() / 
                          ((df['waste'] - df['waste'].mean()) ** 2).sum())
            }
        }
        
        # Calculate feature importance
        correlations = df[['population_growth', 'economic_activity', 'urbanization_rate']].corrwith(df['waste'])
        feature_importance = [
            {'feature': feature, 'importance': importance}
            for feature, importance in correlations.items()
        ]
        
        return {
            'historical_data': historical_data,
            'predictions': predictions,
            'metrics': metrics,
            'feature_importance': feature_importance
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

# backend/requirements.txt
fastapi==0.68.0
uvicorn==0.15.0
pandas==1.3.3
numpy==1.21.2
scikit-learn==0.24.2
prophet==1.0.1
tensorflow==2.6.0
statsmodels==0.13.2
python-multipart==0.0.5
