import logging
import pandas as pd
from fastapi import FastAPI, Form, UploadFile, File
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import joblib
import json
from io import BytesIO, StringIO

app = FastAPI()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Enable CORS for specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update this with the specific origin of your React app
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
#Serve the React build folder as static files
app.mount("/static", StaticFiles(directory="./build/static"),name="static")

# Load the Random Forest model
rf_classifier = joblib.load('rf_model.pkl')  # Load the Random Forest model

# Mapping of crime types to numeric values
crime_mapping = {
    'Assault': 0,
    'Murder': 1,
    'Theft': 2,
    'Fraud': 3,
    'Robbery': 4
}

# Reverse mapping for prediction output
reverse_crime_mapping = {v: k for k, v in crime_mapping.items()}

@app.get('/states')
async def get_states():
    try:
        with open('state_mapping.json', 'r') as f:
            state_mapping = json.load(f)
        states_list = list(state_mapping.keys())
        return JSONResponse({"states": states_list})
    except Exception as e:
        logger.error(f"Error retrieving states: {str(e)}")
        return JSONResponse({"error": f"An error occurred: {str(e)}"}, status_code=500)

@app.get("/")
async def read_index():
    return FileResponse("build/index.html")

@app.post('/upload-dataset')
async def upload_dataset(file: UploadFile):
    """
    Endpoint to upload a dataset in CSV or Excel format.
    The dataset is temporarily stored in memory and previewed.
    """
    try:
        if file.content_type == 'text/csv':
            contents = await file.read()
            df = pd.read_csv(BytesIO(contents))
        elif file.content_type in ['application/vnd.ms-excel',
                                   'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']:
            contents = await file.read()
            df = pd.read_excel(BytesIO(contents))
        else:
            return JSONResponse({"error": "Unsupported file format. Please upload a CSV or Excel file."},
                                status_code=400)

        # Preview the first 5 rows of the dataset
        preview = df.head().to_dict(orient='records')

        # Save the dataframe in memory (can be moved to persistent storage if needed)
        df.to_csv('uploaded_crime_dataset.csv', index=False)

        return JSONResponse({"preview": preview})
    except Exception as e:
        logger.error(f"Error during file upload: {str(e)}")
        return JSONResponse({"error": f"An error occurred during file upload: {str(e)}"}, status_code=500)

@app.post('/crime-analysis')
async def crime_analysis(
        file: UploadFile = File(...),
        state: str = Form(...),
        year: str = Form(...)
):
    try:
        # Read the uploaded CSV file
        contents = await file.read()
        df = pd.read_csv(StringIO(contents.decode('utf-8')))

        # Check if the selected year is a column in the dataset
        if year not in df.columns:
            return JSONResponse({"error": "Selected year is not available in the dataset"}, status_code=404)

        # Filter data based on the selected state
        filtered_df = df[df['state'] == state]
        if filtered_df.empty:
            return JSONResponse({"error": "No data available for the given state"}, status_code=404)

        # Prepare the data for analysis
        filtered_df = filtered_df[['crime_type', year]]
        filtered_df = filtered_df.dropna(subset=[year])
        crime_type_counts = filtered_df['crime_type'].value_counts()

        if crime_type_counts.empty:
            return JSONResponse({"error": "No crime data available for the selected year and state"}, status_code=404)

        # Compute analysis results
        highest_count_crime = crime_type_counts.idxmax() if not crime_type_counts.empty else "No crime data"
        total_crimes = filtered_df.shape[0]
        pie_data = (crime_type_counts / total_crimes * 100).to_dict()
        bar_data = crime_type_counts.to_dict()

        return JSONResponse({
            "highest_count_crime": highest_count_crime,
            "pie_data": pie_data,
            "bar_data": bar_data
        })

    except Exception as e:
        logger.error(f"Error during analysis: {str(e)}")
        return JSONResponse({"error": f"An error occurred during analysis: {str(e)}"}, status_code=500)

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='localhost', port=8007)
