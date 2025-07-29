-----

# iVA: Intelligent Video Analytics

iVA is a real-time web application that processes a live camera feed to perform object detection, text extraction (OCR), and AI-driven contextual analysis. It features a dual-model system, allowing users to switch between general object detection and specific, text-based object searching.

## Features ✨

  * **Dual Detection Modes:**
      * **YOLOv8:** For high-performance, general-purpose object detection (80 classes).
      * **Grounding DINO (Placeholder):** For specific, "open-vocabulary" detection based on a user's text prompt (e.g., "a person wearing a hat").
  * **Real-time Bounding Boxes:** Draws boxes and labels around detected objects directly on the video feed.
  * **Text Extraction (OCR):** Uses Tesseract to read text visible in the video stream.
  * **AI Scene Description:** Leverages the Google Gemini API to generate intelligent descriptions for important scenes.
  * **Optimized Asynchronous Logging:** A background worker intelligently buffers analysis results to a temporary log file, then selects and enriches only the most "reliable" log from each time window to save to a SQL Server database, minimizing API costs and database load.
  * **Interactive UI:** A clean interface with controls to pause/play the video feed and switch between detection modes.

-----

## Technology Stack 💻

  * **Backend:**
      * ASP.NET Core (.NET 9)
      * C\#
      * Entity Framework Core
      * SQL Server
      * `Microsoft.ML.OnnxRuntime` (for YOLOv8 inference)
      * `Google.Ai.Generativelanguage` (Official Gemini SDK)
      * `Tesseract.NET` (for OCR)
  * **Frontend:**
      * HTML5
      * Tailwind CSS
      * Vanilla JavaScript

-----

## Setup and Configuration ⚙️

#### **1. Prerequisites**

  * [.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)
  * [SQL Server](https://www.microsoft.com/en-us/sql-server/sql-server-downloads) (e.g., Express or Developer edition)

#### **2. Required Files**

You must place the following files and folders in the root directory of the C\# project:

  * **`yolov8n.onnx`**: The YOLOv8 model file.
      * Download from: [https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx](https://www.google.com/search?q=https://github.com/ultralytics/assets/releases/download/v0.0.0/yolov8n.onnx)
  * **`tessdata` folder**: This folder must contain the Tesseract language data.
      * Create a folder named `tessdata`.
      * Download `eng.traineddata` from [here](https://www.google.com/search?q=https://github.com/tesseract-ocr/tessdata/blob/main/eng.traineddata) and place it inside the `tessdata` folder.

*(The `.csproj` file is already configured to copy these files to the output directory when you build the project.)*

#### **3. Backend Configuration**

1.  Open the `appsettings.json` file.
2.  Update the `ConnectionStrings.DefaultConnection` value to point to your SQL Server instance.
3.  Update the `Gemini.ApiKey` value with your Google Gemini API key.
4.  Open a terminal in the project root and run the database migration to create the necessary tables:
    ```bash
    dotnet ef database update
    ```

-----

## How to Run 🚀

1.  Open a terminal in the project's root directory.
2.  Run the application using the .NET CLI:
    ```bash
    dotnet run
    ```
3.  The terminal will display the URL the application is running on (e.g., `https://localhost:7123`). Open this URL in your web browser.

-----

## How to Use the Application 🕹️

1.  When the page loads, your browser will ask for permission to use your camera. Click **Allow**.
2.  The application will start in the default "General Detection (YOLO)" mode, automatically identifying and boxing common objects.
3.  To search for a specific object, select the **"Specific Search (DINO)"** radio button and type a description (e.g., "a blue cup") into the text box.
4.  Use the **Pause** and **Play** buttons to control the video feed and the analysis process.
5.  The analytics panel on the right will update with the results from the live analysis. The background worker will save the most relevant logs to the database every 10 seconds.
