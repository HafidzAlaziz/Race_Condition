from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import asyncio
import time
import os

app = FastAPI(title="Ticket War Simulation API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for simulation
INITIAL_TICKETS = 5
COUNTDOWN_SECONDS = 5

tickets_available = INITIAL_TICKETS
logs = []
current_mode = "race"       # "race" or "safe"
war_state = "idle"          # "idle", "countdown", "open", "closed"
countdown_end_time = None   # Unix timestamp when countdown ends and war starts

# Lock for safe mode
ticket_lock = asyncio.Lock()

class BuyRequest(BaseModel):
    user_id: str

class ModeRequest(BaseModel):
    mode: str

@app.get("/api/status")
def get_status():
    now = time.time()
    remaining = 0

    if war_state == "countdown" and countdown_end_time:
        remaining = max(0, countdown_end_time - now)

    return {
        "tickets_available": tickets_available,
        "logs": logs,
        "current_mode": current_mode,
        "war_state": war_state,
        "countdown_remaining": remaining,
    }

@app.post("/api/mode")
def set_mode(req: ModeRequest):
    global current_mode
    if req.mode in ["race", "safe"]:
        current_mode = req.mode
    return {"status": "ok", "current_mode": current_mode}

class ResetRequest(BaseModel):
    initial_tickets: int = 5

@app.post("/api/reset")
def reset_simulation(req: ResetRequest):
    global tickets_available, logs, war_state, countdown_end_time, INITIAL_TICKETS
    INITIAL_TICKETS = req.initial_tickets
    tickets_available = INITIAL_TICKETS
    logs = []
    war_state = "idle"
    countdown_end_time = None
    return {"message": "Simulation reset successfully", "tickets_available": tickets_available}

@app.post("/api/start")
async def start_war():
    global war_state, countdown_end_time
    war_state = "countdown"
    countdown_end_time = time.time() + COUNTDOWN_SECONDS
    
    # Automatically open war after countdown
    asyncio.create_task(open_war_after_countdown())
    return {"message": "Countdown started", "countdown_end_time": countdown_end_time}

async def open_war_after_countdown():
    global war_state
    await asyncio.sleep(COUNTDOWN_SECONDS)
    war_state = "open"

@app.post("/api/buy")
async def buy_ticket(req: BuyRequest):
    global tickets_available, logs, war_state

    if war_state != "open":
        raise HTTPException(status_code=400, detail="War is not open yet")

    if current_mode == "race":
        # RACE CONDITION MODE
        if tickets_available > 0:
            await asyncio.sleep(2.0)
            tickets_available -= 1
            log_entry = {
                "time": time.time(),
                "user": req.user_id,
                "status": "Success",
                "message": f"Bought ticket. Remaining: {tickets_available}",
                "mode": "Race Condition"
            }
            logs.append(log_entry)
            if len(logs) > 100: logs.pop(0)
            return {"status": "Success", "ticket_remaining": tickets_available}
        else:
            log_entry = {
                "time": time.time(),
                "user": req.user_id,
                "status": "Failed",
                "message": "Sold out",
                "mode": "Race Condition"
            }
            logs.append(log_entry)
            if len(logs) > 100: logs.pop(0)
            raise HTTPException(status_code=400, detail="Sold out")

    else:
        # SAFE MODE
        async with ticket_lock:
            if tickets_available > 0:
                await asyncio.sleep(2.0)
                tickets_available -= 1
                log_entry = {
                    "time": time.time(),
                    "user": req.user_id,
                    "status": "Success",
                    "message": f"Bought ticket. Remaining: {tickets_available}",
                    "mode": "Safe Mode"
                }
                logs.append(log_entry)
                if len(logs) > 100: logs.pop(0)
                return {"status": "Success", "ticket_remaining": tickets_available}
            else:
                log_entry = {
                    "time": time.time(),
                    "user": req.user_id,
                    "status": "Failed",
                    "message": "Sold out",
                    "mode": "Safe Mode"
                }
                logs.append(log_entry)
                if len(logs) > 100: logs.pop(0)
                raise HTTPException(status_code=400, detail="Sold out")

# Serve the frontend build
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")
app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
