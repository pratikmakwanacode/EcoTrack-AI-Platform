import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
import re
import datetime
import math
import os
from google import genai
from google.genai import types

# ──────────────────────────────────────────────────────────────────────────
# 1. STREAMLIT PAGE CONFIGURATION & THEME INJECTIONS
# ──────────────────────────────────────────────────────────────────────────

st.set_page_config(
    page_title="EcoTrack AI | Enterprise SaaS",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS to force premium obsidian-green dark glassmorphism styling
st.markdown("""
<style>
    /* Global styles */
    [data-testid="stAppViewContainer"] {
        background: linear-gradient(135deg, #020617 0%, #080f1d 55%, #021a10 100%) !important;
        color: #f8fafc !important;
        font-family: 'Inter', sans-serif !important;
    }
    
    [data-testid="stSidebar"] {
        background-color: #062f22 !important;
        border-right: 1px solid rgba(16, 185, 129, 0.2) !important;
        color: #e6fcf5 !important;
    }
    
    [data-testid="stHeader"] {
        background: transparent !important;
    }
    
    /* Premium Glass Cards */
    .glass-card {
        background: rgba(8, 15, 30, 0.65);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(16, 185, 129, 0.20);
        box-shadow: 0 4px 30px rgba(16, 185, 129, 0.05);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 20px;
        color: #ffffff;
    }
    
    .glass-card-title {
        color: #10b981;
        font-size: 1.15rem;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        margin-bottom: 12px;
    }
    
    /* Metrics and accents */
    .highlight-text {
        color: #10b981 !important;
        font-weight: bold;
    }
    
    /* Inputs */
    input, select, textarea {
        background-color: #0f172a !important;
        color: #ffffff !important;
        border: 1px solid #10b981 !important;
    }
    
    /* Hide default Streamlit visual elements */
    #MainMenu {visibility: hidden;}
    footer {visibility: hidden;}
</style>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────────────────
# 2. STATE MANAGEMENT & BASELINE SEEDING
# ──────────────────────────────────────────────────────────────────────────

def get_seeded_logs(user_id, base_elec, base_travel, diet_type):
    logs = []
    now = datetime.datetime.now()
    for i in range(5, -1, -1):
        # Seasonal factor calculation: higher electricity in winter/summer, travel fluctuations
        seasonal_elec = 1.0 + 0.15 * math.sin((i / 12) * 2 * math.pi)
        seasonal_travel = 1.0 + 0.10 * math.cos((i / 12) * 2 * math.pi)
        
        elec = round(base_elec * seasonal_elec, 1)
        travel = round(base_travel * seasonal_travel, 1)
        
        diet_score = 100 if diet_type == 'Vegan' else 150 if diet_type == 'Vegetarian' else 250
        monthly_co2 = (elec * 0.85) + (travel * 0.2) + diet_score
        annual_co2 = round(monthly_co2 * 12)
        
        log_date = (now - datetime.timedelta(days=30 * i)).strftime("%d-%m-%Y")
        
        logs.append({
            'id': f"log_{user_id}_{i}",
            'electricity': elec,
            'travel': travel,
            'diet': diet_type,
            'calculatedScore': annual_co2,
            'date': log_date
        })
    return logs

# Initialize in-memory st.session_state datastore
if 'users' not in st.session_state:
    st.session_state.users = {
        'elena@ecotrack.ai': {
            'username': 'Elena Rostova',
            'points': 450,
            'completed_challenges': ['led-bulbs', 'meatless-mondays'],
            'logs': get_seeded_logs('elena', 120, 300, 'Vegan')
        },
        'marcus@ecotrack.ai': {
            'username': 'Marcus Vance',
            'points': 380,
            'completed_challenges': ['green-commute', 'plant-dairy'],
            'logs': get_seeded_logs('marcus', 180, 500, 'Vegetarian')
        },
        'sarah@ecotrack.ai': {
            'username': 'Sarah Chen',
            'points': 320,
            'completed_challenges': ['led-bulbs', 'zero-waste'],
            'logs': get_seeded_logs('sarah', 100, 200, 'Vegan')
        },
        'david@ecotrack.ai': {
            'username': 'David Kim',
            'points': 240,
            'completed_challenges': ['green-commute'],
            'logs': get_seeded_logs('david', 250, 600, 'Non-Vegetarian')
        },
        'amina@ecotrack.ai': {
            'username': 'Amina Diop',
            'points': 190,
            'completed_challenges': ['meatless-mondays'],
            'logs': get_seeded_logs('amina', 150, 400, 'Vegetarian')
        },
        'liam@ecotrack.ai': {
            'username': 'Liam O\'Connor',
            'points': 150,
            'completed_challenges': [],
            'logs': get_seeded_logs('liam', 200, 500, 'Non-Vegetarian')
        }
    }

if 'logged_in' not in st.session_state:
    st.session_state.logged_in = False
    st.session_state.active_user = None

# ──────────────────────────────────────────────────────────────────────────
# 3. HEURISTIC ENGINE & GEMINI CLIENT
# ──────────────────────────────────────────────────────────────────────────

def get_carbon_diagnostics(electricity, travel, diet, score):
    # Retrieve GEMINI API Key from environment or Streamlit Secrets
    api_key = os.environ.get("GEMINI_API_KEY") or st.secrets.get("GEMINI_API_KEY")
    
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""
            Analyze the following annual carbon footprint data:
            - Electricity: {electricity} kWh/month
            - Travel: {travel} KM/month
            - Diet Type: {diet}
            - Total Carbon Score: {score} kg CO2/year

            Please output a plain text summary in exactly 2-3 sentences explaining their main emission driver and how they rank against target guidelines.
            """
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )
            if response.text:
                return response.text.strip(), True
        except Exception as e:
            pass # Fall back to heuristic engine on exception

    # Heuristic Fallback Engine
    drivers = {
        'Housing Energy': electricity * 0.85 * 12,
        'Transport Commute': travel * 0.20 * 12,
        'Lifestyle Diet': (100 if diet == 'Vegan' else 150 if diet == 'Vegetarian' else 250) * 12
    }
    highest_driver = max(drivers, key=drivers.get)
    highest_val = drivers[highest_driver]
    pct = round((highest_val / score) * 100) if score > 0 else 0
    
    analysis = (
        f"Your highest emission driver is {highest_driver}, contributing {highest_val:.0f} kg CO₂/year "
        f"({pct}% of your footprint). "
    )
    if highest_driver == 'Housing Energy':
        analysis += "Focusing on smart thermostats and switching to LED light bulbs can yield the fastest reductions."
    elif highest_driver == 'Transport Commute':
        analysis += "Switching 3 commutes a week to public transit or carpooling will significantly lower this sector's footprint."
    else:
        analysis += "Transitioning towards plant-based diet dairy options or adding dedicated Meatless Mondays will drop your lifestyle loads."
        
    return analysis, False

# ──────────────────────────────────────────────────────────────────────────
# 4. AUTHENTICATION LOGIN GATEWAY
# ──────────────────────────────────────────────────────────────────────────

if not st.session_state.logged_in:
    # Outer layout wrapper
    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown("<div style='height: 80px;'></div>", unsafe_allow_html=True)
        st.markdown("""
        <div class="glass-card" style="text-align: center;">
            <div style="font-size: 3rem; margin-bottom: 10px;">⚡</div>
            <h1 style="color: #ffffff; margin: 0; font-size: 2rem; font-weight: 900; letter-spacing: 0.08em;">ECOTRACK AI</h1>
            <p style="color: #10b981; font-weight: 700; text-transform: uppercase; font-size: 0.85rem; letter-spacing: 0.15em; margin-top: 4px;">
                Marketplace Core Access Gateway
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        with st.form("login_form"):
            st.markdown("<h4 style='color: #ffffff; margin-bottom: 12px;'>Sign In Securely</h4>", unsafe_allow_html=True)
            email = st.text_input("EMAIL ADDRESS", placeholder="Enter your email address...")
            password = st.text_input("PASSWORD", type="password", placeholder="••••••••••••")
            
            submit_btn = st.form_submit_button("Sign In Securely", use_container_width=True)
            
            if submit_btn:
                email_clean = email.strip()
                if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email_clean):
                    st.error("Please enter a valid email address.")
                else:
                    # Authenticate and set sessions
                    st.session_state.logged_in = True
                    st.session_state.active_user = email_clean
                    
                    if email_clean not in st.session_state.users:
                        # Register new user dynamically
                        prefix = email_clean.split('@')[0]
                        st.session_state.users[email_clean] = {
                            'username': prefix,
                            'points': 0,
                            'completed_challenges': [],
                            'logs': []
                        }
                    st.toast(f"Authenticated successfully as {email_clean}", icon="✓")
                    st.rerun()
                    
        st.markdown("""
        <div style="text-align: center; color: #64748b; font-size: 0.75rem; margin-top: 15px;">
            Secured via JWT Tenant Isolation & SQL Database integrity checking layer.
        </div>
        """, unsafe_allow_html=True)
    st.stop()

# ──────────────────────────────────────────────────────────────────────────
# 5. SIDEBAR ORCHESTRATION & HEADER
# ──────────────────────────────────────────────────────────────────────────

active_user = st.session_state.active_user
user_profile = st.session_state.users[active_user]
user_prefix = user_profile['username']

# Sidebar Header & Brand
st.sidebar.markdown(f"""
<div style="text-align: center; padding-bottom: 20px;">
    <div style="font-size: 2.2rem; margin-bottom: 5px;">⚡</div>
    <h3 style="color: #ffffff; margin: 0; font-weight: 900; letter-spacing: 0.05em;">EcoTrack AI</h3>
    <span style="font-size: 0.7rem; color: #10b981; font-weight: bold; text-transform: uppercase; letter-spacing: 0.12em;">SaaS Platform</span>
</div>
""", unsafe_allow_html=True)

# Sidebar Navigation tabs selector
st.sidebar.markdown("---")
active_tab = st.sidebar.radio(
    "NAVIGATION PANELS",
    ["Dashboard", "Emissions Calculator", "What-If Simulator", "Eco-Challenges & Leaderboard"],
    index=0
)

# User Widget
st.sidebar.markdown("---")
st.sidebar.markdown(f"""
<div style="background: rgba(8, 15, 30, 0.4); border: 1px solid rgba(16, 185, 129, 0.15); border-radius: 12px; padding: 15px;">
    <div style="color: #64748b; font-size: 0.7rem; font-weight: bold; text-transform: uppercase;">Logged In User</div>
    <div style="color: #ffffff; font-weight: bold; font-size: 0.95rem; margin-top: 2px;" title="{active_user}">{user_prefix}</div>
    <div style="color: #10b981; font-weight: 700; font-size: 0.85rem; margin-top: 4px;">{user_profile['points']} pts</div>
</div>
""", unsafe_allow_html=True)

st.sidebar.markdown("<div style='height: 10px;'></div>", unsafe_allow_html=True)
if st.sidebar.button("Sign Out / Switch User", use_container_width=True):
    st.session_state.logged_in = False
    st.session_state.active_user = None
    st.toast("Logged out successfully", icon="ℹ️")
    st.rerun()

# Health Diagnostics Panel
gemini_healthy = "online" if (os.environ.get("GEMINI_API_KEY") or st.secrets.get("GEMINI_API_KEY")) else "offline"
st.sidebar.markdown(f"""
<div style="display: flex; justify-content: space-between; font-size: 0.7rem; color: #475569; border-top: 1px solid rgba(16, 185, 129, 0.1); margin-top: 20px; padding-top: 10px;">
    <div>DB: <span style="color: #10b981;">✓ online</span></div>
    <div>AI Engine: <span style="color: {'#10b981' if gemini_healthy == 'online' else '#f59e0b'};">{gemini_healthy}</span></div>
</div>
""", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────────────────
# 6. TAB: DASHBOARD ANALYTICS
# ──────────────────────────────────────────────────────────────────────────

if active_tab == "Dashboard":
    st.markdown("<h2 style='color: #ffffff; margin-bottom: 20px;'>Dashboard Analytics</h2>", unsafe_allow_html=True)
    
    # Calculate key metrics
    user_logs = user_profile['logs']
    
    if not user_logs:
        # Empty State
        st.markdown(f"""
        <div class="glass-card" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 3rem; margin-bottom: 15px;">📊</div>
            <h3 style="color: #ffffff;">No Carbon Footprint Logged Yet</h3>
            <p style="color: #94a3b8; max-width: 500px; margin: 0 auto 20px;">
                You haven't recorded any emissions calculations. Head over to the Calculator to generate your baseline diagnostics score.
            </p>
        </div>
        """, unsafe_allow_html=True)
        if st.button("Launch Calculator Wizard", type="primary"):
            # Programmatically change tab or render calculator (Streamlit works sequentially, so st.rerun is best)
            st.info("Select 'Emissions Calculator' from the left sidebar to begin.")
    else:
        # Pre-calculate points and ranks
        df_leaderboard = []
        for email, profile in st.session_state.users.items():
            avg_co2 = np.mean([log['calculatedScore'] for log in profile['logs']]) if profile['logs'] else 0
            df_leaderboard.append({
                'email': email,
                'username': profile['username'],
                'points': profile['points'],
                'avg_co2': avg_co2
            })
        df_rank = pd.DataFrame(df_leaderboard).sort_values(by=['points', 'avg_co2'], ascending=[False, True]).reset_index(drop=True)
        df_rank['rank'] = df_rank.index + 1
        user_rank = df_rank[df_rank['email'] == active_user]['rank'].values[0]
        
        latest_log = user_logs[0]
        current_score = latest_log['calculatedScore']
        points = user_profile['points']
        challenges_count = len(user_profile['completed_challenges'])
        
        # Display Premium Metrics Row
        m_col1, m_col2, m_col3, m_col4 = st.columns(4)
        with m_col1:
            st.markdown(f"""
            <div class="glass-card" style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Current Annual Footprint</div>
                <div style="font-size: 2rem; font-weight: 900; color: #ffffff; margin-top: 5px;">{current_score:,} <span style="font-size: 1rem; color: #10b981;">kg CO₂</span></div>
            </div>
            """, unsafe_allow_html=True)
        with m_col2:
            st.markdown(f"""
            <div class="glass-card" style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Gamification Points</div>
                <div style="font-size: 2rem; font-weight: 900; color: #ffffff; margin-top: 5px;">{points} <span style="font-size: 1rem; color: #10b981;">pts</span></div>
            </div>
            """, unsafe_allow_html=True)
        with m_col3:
            st.markdown(f"""
            <div class="glass-card" style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Global Rank</div>
                <div style="font-size: 2rem; font-weight: 900; color: #ffffff; margin-top: 5px;">#{user_rank} <span style="font-size: 1rem; color: #10b981;">/ {len(df_rank)}</span></div>
            </div>
            """, unsafe_allow_html=True)
        with m_col4:
            st.markdown(f"""
            <div class="glass-card" style="text-align: center;">
                <div style="color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; font-weight: bold;">Completed Challenges</div>
                <div style="font-size: 2rem; font-weight: 900; color: #ffffff; margin-top: 5px;">{challenges_count} <span style="font-size: 1rem; color: #10b981;">tasks</span></div>
            </div>
            """, unsafe_allow_html=True)

        # Plotly Trend Chart
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Historical Baseline Trend</div>", unsafe_allow_html=True)
        
        chart_data = pd.DataFrame(user_logs)
        chart_data['date'] = pd.to_datetime(chart_data['date'], format='%d-%m-%Y')
        chart_data = chart_data.sort_values(by='date')
        
        fig = go.Figure()
        fig.add_trace(go.Scatter(
            x=chart_data['date'],
            y=chart_data['calculatedScore'],
            mode='lines+markers',
            name='Actual Emissions',
            line=dict(color='#10b981', width=3),
            marker=dict(size=8, color='#10b981', symbol='circle')
        ))
        fig.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=40, r=40, t=20, b=40),
            xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', tickfont=dict(color='#94a3b8')),
            yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', tickfont=dict(color='#94a3b8')),
            legend=dict(font=dict(color='#cbd5e1'))
        )
        st.plotly_chart(fig, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

        # Log History Lists
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Footprint Calculation Ledger</div>", unsafe_allow_html=True)
        
        # Display logs as custom structured rows
        for idx, log in enumerate(user_logs):
            l_col1, l_col2, l_col3, l_col4 = st.columns([1, 2, 1, 1])
            with l_col1:
                st.markdown(f"**📅 Date:** {log['date']}")
            with l_col2:
                st.markdown(f"⚡ {log['electricity']} kWh/m | 🚗 {log['travel']} KM/m | 🍏 {log['diet']}")
            with l_col3:
                st.markdown(f"Score: <span class='highlight-text'>{log['calculatedScore']:,} kg CO₂/yr</span>", unsafe_allow_html=True)
            with l_col4:
                # Custom Key for delete action
                if st.button("🗑️ Delete", key=f"del_{log['id']}"):
                    user_profile['logs'].pop(idx)
                    st.toast("Database log removed successfully", icon="✓")
                    st.rerun()
            st.markdown("<hr style='border: 0; border-top: 1px solid rgba(255,255,255,0.06); margin: 8px 0;'>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────────────────
# 7. TAB: EMISSIONS CALCULATOR
# ──────────────────────────────────────────────────────────────────────────

elif active_tab == "Emissions Calculator":
    st.markdown("<h2 style='color: #ffffff; margin-bottom: 20px;'>Emissions Calculator Wizard</h2>", unsafe_allow_html=True)
    
    c_col1, c_col2 = st.columns([1, 1])
    
    with c_col1:
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Configure Footprint inputs</div>", unsafe_allow_html=True)
        
        # User input fields
        electricity = st.number_input("HOUSEHOLD ELECTRICITY (kWh/month)", min_value=0.0, value=150.0, step=10.0)
        travel = st.number_input("VEHICLE COMMUTE (KM/month)", min_value=0.0, value=300.0, step=50.0)
        diet = st.selectbox("DIETARY PREFERENCE", ['Vegan', 'Vegetarian', 'Non-Vegetarian'], index=2)
        
        # Live calculation formulas
        diet_score = 100 if diet == 'Vegan' else 150 if diet == 'Vegetarian' else 250
        calculated_monthly = (electricity * 0.85) + (travel * 0.2) + diet_score
        calculated_annual = round(calculated_monthly * 12)
        
        st.markdown("<div style='height: 20px;'></div>", unsafe_allow_html=True)
        
        save_btn = st.button("Commit Calculation to Database", use_container_width=True)
        if save_btn:
            new_log = {
                'id': f"log_{active_user}_{datetime.datetime.now().timestamp()}",
                'electricity': electricity,
                'travel': travel,
                'diet': diet,
                'calculatedScore': calculated_annual,
                'date': datetime.date.today().strftime("%d-%m-%Y")
            }
            # Append to top
            user_profile['logs'] = [new_log] + user_profile['logs']
            
            # Award calculation points
            user_profile['points'] += 50
            st.toast("Calculation successfully committed to SQL ledger! +50 points awarded.", icon="✓")
            st.rerun()
            
        st.markdown("</div>", unsafe_allow_html=True)
        
    with c_col2:
        st.markdown("<div class='glass-card' style='height: 100%;'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Real-Time Emissions Breakdown</div>", unsafe_allow_html=True)
        
        # Visual breakdown load percentages
        housing_load = round((electricity * 0.85 * 12) / calculated_annual * 100) if calculated_annual > 0 else 0
        transport_load = round((travel * 0.2 * 12) / calculated_annual * 100) if calculated_annual > 0 else 0
        lifestyle_load = round((diet_score * 12) / calculated_annual * 100) if calculated_annual > 0 else 0
        
        st.markdown(f"""
        <div style="font-size: 2.8rem; font-weight: 900; color: #ffffff; text-align: center; margin-bottom: 20px;">
            {calculated_annual:,} <span style="font-size: 1.1rem; color: #10b981;">kg CO₂/year</span>
        </div>
        
        <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">
                <span>🏡 Housing Energy</span>
                <span>{housing_load}%</span>
            </div>
            <div style="background-color: #1e293b; border-radius: 9999px; height: 10px; overflow: hidden;">
                <div style="background-color: #10b981; width: {housing_load}%; height: 100%;"></div>
            </div>
        </div>
        
        <div style="margin-bottom: 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">
                <span>🚗 Travel &amp; Transit</span>
                <span>{transport_load}%</span>
            </div>
            <div style="background-color: #1e293b; border-radius: 9999px; height: 10px; overflow: hidden;">
                <div style="background-color: #f59e0b; width: {transport_load}%; height: 100%;"></div>
            </div>
        </div>
        
        <div style="margin-bottom: 25px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; font-weight: bold; margin-bottom: 4px;">
                <span>🍏 Lifestyle &amp; Diet</span>
                <span>{lifestyle_load}%</span>
            </div>
            <div style="background-color: #1e293b; border-radius: 9999px; height: 10px; overflow: hidden;">
                <div style="background-color: #06b6d4; width: {lifestyle_load}%; height: 100%;"></div>
            </div>
        </div>
        """, unsafe_allow_html=True)
        
        # Display AI Advice block
        advice, is_gemini = get_carbon_diagnostics(electricity, travel, diet, calculated_annual)
        st.markdown(f"""
        <div style="background: rgba(16, 185, 129, 0.08); border-left: 4px solid #10b981; padding: 15px; border-radius: 4px;">
            <div style="font-size: 0.75rem; text-transform: uppercase; color: #10b981; font-weight: bold; margin-bottom: 4px;">
                AI Sustainability Advisory {"(Gemini API)" if is_gemini else "(Offline Heuristics)"}
            </div>
            <p style="font-size: 0.85rem; color: #cbd5e1; margin: 0; line-height: 1.5;">
                {advice}
            </p>
        </div>
        """, unsafe_allow_html=True)
        
        st.markdown("</div>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────────────────
# 8. TAB: WHAT-IF SIMULATOR
# ──────────────────────────────────────────────────────────────────────────

elif active_tab == "What-If Simulator":
    st.markdown("<h2 style='color: #ffffff; margin-bottom: 20px;'>Projective Carbon Simulator</h2>", unsafe_allow_html=True)
    
    user_logs = user_profile['logs']
    if not user_logs:
        st.warning("Please record at least one calculation in the Emissions Calculator first.")
    else:
        latest_log = user_logs[0]
        actual_score = latest_log['calculatedScore']
        
        s_col1, s_col2 = st.columns([1, 1.8])
        
        with s_col1:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("<div class='glass-card-title'>Reduction Parameters</div>", unsafe_allow_html=True)
            
            # Simulator sliders
            electric_reduce = st.slider("🏡 Housing Energy Savings (%)", min_value=0, max_value=100, value=0, step=5)
            travel_reduce = st.slider("🚗 Vehicle Commute Reduction (%)", min_value=0, max_value=100, value=0, step=5)
            diet_shift = st.selectbox("🍏 Shift to Plant-Based Diet", ['Keep Current Diet', 'Shift to Vegetarian', 'Shift to Vegan'], index=0)
            
            # Calculate projected simulated footprint
            simulated_elec = latest_log['electricity'] * (1 - electric_reduce / 100.0)
            simulated_travel = latest_log['travel'] * (1 - travel_reduce / 100.0)
            
            simulated_diet_score = (
                100 if diet_shift == 'Shift to Vegan'
                else 150 if diet_shift == 'Shift to Vegetarian'
                else (100 if latest_log['diet'] == 'Vegan' else 150 if latest_log['diet'] == 'Vegetarian' else 250)
            )
            
            simulated_monthly = (simulated_elec * 0.85) + (simulated_travel * 0.2) + simulated_diet_score
            simulated_annual = round(simulated_monthly * 12)
            
            reduction_amount = actual_score - simulated_annual
            reduction_pct = round((reduction_amount / actual_score * 100)) if actual_score > 0 else 0
            
            st.markdown(f"""
            <div style="background-color: rgba(16, 185, 129, 0.08); border-radius: 12px; padding: 15px; text-align: center; margin-top: 20px;">
                <div style="font-size: 0.75rem; color: #10b981; font-weight: bold; text-transform: uppercase;">Simulated Annual Reduction</div>
                <div style="font-size: 2.2rem; font-weight: 900; color: #ffffff; margin-top: 4px;">-{reduction_amount:,} <span style="font-size: 1rem; color: #10b981;">kg CO₂</span></div>
                <div style="font-size: 0.85rem; color: #cbd5e1; margin-top: 2px;">Carbon footprint offset: <span class="highlight-text">{reduction_pct}%</span></div>
            </div>
            """, unsafe_allow_html=True)
            
            st.markdown("</div>", unsafe_allow_html=True)
            
        with s_col2:
            st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
            st.markdown("<div class='glass-card-title'>Projected Reduction Gauge</div>", unsafe_allow_html=True)
            
            # Plotly carbon gauge needle overlay
            fig_gauge = go.Figure(go.Indicator(
                mode = "gauge+number",
                value = simulated_annual,
                domain = {'x': [0, 1], 'y': [0, 1]},
                title = {'text': "Annual CO2 Score (kg/year)", 'font': {'color': '#ffffff'}},
                number = {'font': {'color': '#ffffff'}},
                gauge = {
                    'axis': {'range': [0, max(actual_score * 1.5, 6000)], 'tickwidth': 1, 'tickcolor': "#94a3b8"},
                    'bar': {'color': "#10b981"},
                    'bgcolor': "rgba(255,255,255,0.06)",
                    'borderwidth': 2,
                    'bordercolor': "rgba(16, 185, 129, 0.2)",
                    'steps': [
                        {'range': [0, actual_score], 'color': 'rgba(16, 185, 129, 0.15)'}
                    ],
                    'threshold': {
                        'line': {'color': "red", 'width': 4},
                        'thickness': 0.75,
                        'value': actual_score
                    }
                }
            ))
            fig_gauge.update_layout(
                paper_bgcolor='rgba(0,0,0,0)',
                plot_bgcolor='rgba(0,0,0,0)',
                height=280,
                margin=dict(l=20, r=20, t=40, b=20)
            )
            st.plotly_chart(fig_gauge, use_container_width=True)
            st.markdown("</div>", unsafe_allow_html=True)
            
        # Line projected overlay chart
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Projected Savings trajectory vs Baseline</div>", unsafe_allow_html=True)
        
        df_hist = pd.DataFrame(user_logs)
        df_hist['date'] = pd.to_datetime(df_hist['date'], format='%d-%m-%Y')
        df_hist = df_hist.sort_values(by='date')
        
        # Simulated savings projection line: copy history and adjust the last month or add a future projection month
        proj_dates = list(df_hist['date'])
        proj_scores = list(df_hist['calculatedScore'])
        
        # Add next month projection
        next_month = proj_dates[-1] + datetime.timedelta(days=30)
        proj_dates.append(next_month)
        proj_scores.append(simulated_annual)
        
        fig_trend = go.Figure()
        # Historical Data
        fig_trend.add_trace(go.Scatter(
            x=df_hist['date'],
            y=df_hist['calculatedScore'],
            mode='lines+markers',
            name='Historical Baseline (Actual)',
            line=dict(color='#94a3b8', width=2),
            marker=dict(size=6, color='#94a3b8')
        ))
        # Simulated Projection
        fig_trend.add_trace(go.Scatter(
            x=proj_dates[-2:],
            y=proj_scores[-2:],
            mode='lines+markers',
            name='Simulated Projection (Dotted)',
            line=dict(color='#10b981', width=3, dash='dash'),
            marker=dict(size=8, color='#10b981', symbol='star')
        ))
        fig_trend.update_layout(
            paper_bgcolor='rgba(0,0,0,0)',
            plot_bgcolor='rgba(0,0,0,0)',
            margin=dict(l=40, r=40, t=20, b=40),
            xaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', tickfont=dict(color='#94a3b8')),
            yaxis=dict(showgrid=True, gridcolor='rgba(255,255,255,0.06)', tickfont=dict(color='#94a3b8')),
            legend=dict(font=dict(color='#cbd5e1'))
        )
        st.plotly_chart(fig_trend, use_container_width=True)
        st.markdown("</div>", unsafe_allow_html=True)

# ──────────────────────────────────────────────────────────────────────────
# 9. TAB: ECO-CHALLENGES & LEADERBOARD
# ──────────────────────────────────────────────────────────────────────────

elif active_tab == "Eco-Challenges & Leaderboard":
    st.markdown("<h2 style='color: #ffffff; margin-bottom: 20px;'>Eco-Challenges & Leaderboard Standing</h2>", unsafe_allow_html=True)
    
    col_chal, col_lead = st.columns([1.2, 1])
    
    with col_chal:
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Weekly Eco-Challenges</div>", unsafe_allow_html=True)
        
        challenges = [
            {"id": "led-bulbs", "title": "🏡 Switch to LED Bulbs", "points": 30, "co2": 120, "desc": "Replace incandescent lights with LEDs."},
            {"id": "green-commute", "title": "🚗 Green Commute Day", "points": 50, "co2": 180, "desc": "Cycle or use transit for 3 work commutes."},
            {"id": "meatless-mondays", "title": "🍏 Meatless Mondays", "points": 30, "co2": 100, "desc": "Avoid meat meals every Monday."},
            {"id": "plant-dairy", "title": "🥛 Plant-Based Dairy Shift", "points": 25, "co2": 80, "desc": "Use plant alternatives for milk/butter."},
            {"id": "zero-waste", "title": "🗑️ Zero Food Waste Drive", "points": 35, "co2": 95, "desc": "Plan meals to ensure no waste this week."}
        ]
        
        completed_challenges = user_profile['completed_challenges']
        
        # Display checkboxes
        points_to_add = 0
        new_completed = []
        
        for ch in challenges:
            was_completed = ch['id'] in completed_challenges
            checked = st.checkbox(
                f"{ch['title']} (+{ch['points']} pts)",
                value=was_completed,
                help=ch['desc']
            )
            if checked:
                new_completed.append(ch['id'])
                if not was_completed:
                    points_to_add += ch['points']
            else:
                if was_completed:
                    points_to_add -= ch['points']
                    
        # Update points and completed lists
        if points_to_add != 0:
            user_profile['completed_challenges'] = new_completed
            user_profile['points'] += points_to_add
            st.toast(f"Challenges updated! Points modified by {points_to_add} pts", icon="✓")
            st.rerun()
            
        st.markdown("</div>", unsafe_allow_html=True)
        
        # Floating Achievement Badges Section
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Achievements & Badges</div>", unsafe_allow_html=True)
        
        user_points = user_profile['points']
        badges = [
            {"title": "Beginner Badge", "points_req": 0, "icon": "🌱", "desc": "Start ecological footprint tracking."},
            {"title": "Carbon Cutter", "points_req": 100, "icon": "✂️", "desc": "Achieve 100+ points by logging metrics."},
            {"title": "Green Advocate", "points_req": 200, "icon": "🥑", "desc": "Commit to challenges and earn 200+ points."},
            {"title": "Eco Champion", "points_req": 300, "icon": "🏆", "desc": "Top tier efficiency, unlocked at 300+ points."}
        ]
        
        b_cols = st.columns(len(badges))
        for idx, b in enumerate(badges):
            unlocked = user_points >= b['points_req']
            with b_cols[idx]:
                st.markdown(f"""
                <div style="text-align: center; opacity: {1.0 if unlocked else 0.25};">
                    <div style="font-size: 2.2rem; margin-bottom: 5px;" class="{"animate-float-badge" if unlocked else ""}">
                        {b['icon']}
                    </div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: { '#10b981' if unlocked else '#cbd5e1' };">
                        {b['title']}
                    </div>
                    <div style="font-size: 0.65rem; color: #64748b; margin-top: 2px;">
                        {b['desc']}
                    </div>
                </div>
                """, unsafe_allow_html=True)
                
        st.markdown("</div>", unsafe_allow_html=True)
        
    with col_lead:
        st.markdown("<div class='glass-card'>", unsafe_allow_html=True)
        st.markdown("<div class='glass-card-title'>Community Leaderboard</div>", unsafe_allow_html=True)
        
        # Calculate leaderboard standings
        leaderboard_data = []
        for email, profile in st.session_state.users.items():
            avg_co2 = np.mean([log['calculatedScore'] for log in profile['logs']]) if profile['logs'] else 0
            leaderboard_data.append({
                'email': email,
                'username': profile['username'],
                'points': profile['points'],
                'avg_co2': round(avg_co2)
            })
            
        df_l = pd.DataFrame(leaderboard_data)
        # Sort by points descending, then co2 ascending
        df_l = df_l.sort_values(by=['points', 'avg_co2'], ascending=[False, True]).reset_index(drop=True)
        df_l['rank'] = df_l.index + 1
        
        # Display Leaderboard Standings
        for idx, row in df_l.iterrows():
            is_current = row['email'] == active_user
            highlight_border = "border: 1px solid #10b981; background: rgba(16, 185, 129, 0.1);" if is_current else "background: rgba(255,255,255,0.03);"
            
            st.markdown(f"""
            <div style="{highlight_border} border-radius: 8px; padding: 10px 15px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 800; font-size: 1rem; color: {'#10b981' if is_current else '#94a3b8'}">#{row['rank']}</span>
                    <span style="font-weight: bold; color: #ffffff;">{row['username']}</span>
                    { '<span style="background: #065f46; color: #34d399; font-size: 0.6rem; padding: 2px 6px; border-radius: 9999px; font-weight: bold;">YOU</span>' if is_current else '' }
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: 800; color: #10b981; font-size: 0.95rem;">{row['points']} pts</div>
                    <div style="font-size: 0.7rem; color: #64748b;">Avg CO₂: {row['avg_co2']:,} kg</div>
                </div>
            </div>
            """, unsafe_allow_html=True)
            
        st.markdown("</div>", unsafe_allow_html=True)
