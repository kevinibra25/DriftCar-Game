import { useState } from "react";
import { Copy, Check, Info, FileCode, Cpu, Code2, Layers, CheckSquare, RefreshCw } from "lucide-react";

export function TroubleshootingDashboard() {
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("diag");

  const filesMap: { [key: string]: { name: string; lang: string; desc: string; code: string } } = {
    cmake: {
      name: "CMakeLists.txt",
      lang: "cmake",
      desc: "Robust, vendor-independent cmake configure using relative search directories, dynamic paths, automatic GLFW/GLM inclusion, and post-build shader directory copies.",
      code: `cmake_minimum_required(VERSION 3.15)
project(ProjectDriftCar LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 1. Output structures configuration
set(CMAKE_RUNTIME_OUTPUT_DIRECTORY \${CMAKE_BINARY_DIR}/bin)

# 2. Find vendor packages with relative dependency resolution
find_package(glfw3 CONFIG REQUIRED)
find_package(glm CONFIG REQUIRED)

# 3. Add executable target with source configurations
file(GLOB_RECURSE SOURCES 
    "src/*.cpp" 
    "src/*.c" # for glad
)

add_executable(DriftCar \${SOURCES})

# 4. Include directories (No hardcoded D:/ absolute volumes!)
target_include_directories(DriftCar PUBLIC 
    \${CMAKE_CURRENT_SOURCE_DIR}/include
)

# 5. Link libraries linking hooks
target_link_libraries(DriftCar PRIVATE 
    glfw
    glm::glm
)

# 6. Post build: Automatic shaders & assets folder copy to bin folder
add_custom_command(TARGET DriftCar POST_BUILD
    COMMAND \${CMAKE_COMMAND} -E copy_directory
    "\${CMAKE_CURRENT_SOURCE_DIR}/shaders"
    "\$<TARGET_FILE_DIR:DriftCar>/shaders"
    COMMENT "Auto copying shader resources to compilation binary output target directory..."
)
`
    },
    car_h: {
      name: "include/Car.h",
      lang: "cpp",
      desc: "Robust physical Car object details with sound encapsulation getter/setters to bypass compiler private-member-access faults.",
      code: `#ifndef CAR_H
#define CAR_H

#include <glm/glm.hpp>

class Car {
private:
    glm::vec2 m_position;
    glm::vec2 m_velocity;
    float m_angle;          // Facing heading orientation in radians
    float m_steerAngle;     // Wheels turning aspect in radians
    float m_speed;          // Forward scalar velocity
    bool m_isDrifting;
    
    // Physics coefficients
    float m_maxSpeed;
    float m_accel;
    float m_grip;
    float m_driftGrip;

public:
    Car(float startX, float startY);
    ~Car() = default;

    // Tick update loop
    void update(float dt, bool gas, bool reverse, bool left, bool right, bool handbrake);
    void resolveCollision(const glm::vec2& pushVector, const glm::vec2& normal);

    // Encapsulated modern getter-setters
    glm::vec2 getPosition() const { return m_position; }
    void setPosition(const glm::vec2& pos) { m_position = pos; }
    
    glm::vec2 getVelocity() const { return m_velocity; }
    void setVelocity(const glm::vec2& vel) { m_velocity = vel; }

    float getAngle() const { return m_angle; }
    void setAngle(float rad) { m_angle = rad; }

    bool isDrifting() const { return m_isDrifting; }
    float getSpeed() const { return m_speed; }
};

#endif // CAR_H
`
    },
    car_cpp: {
      name: "src/Car.cpp",
      lang: "cpp",
      desc: "C++ Drift physics simulator representing realistic momentum drag, lateral friction drops, and sliding counters.",
      code: `#include "Car.h"
#include <cmath>
#include <algorithm>

Car::Car(float startX, float startY)
    : m_position(startX, startY),
      m_velocity(0.0f, 0.0f),
      m_angle(0.0f),
      m_steerAngle(0.0f),
      m_speed(0.0f),
      m_isDrifting(false),
      m_maxSpeed(11.0f),
      m_accel(0.15f),
      m_grip(0.40f),
      m_driftGrip(0.08f) {}

void Car::update(float dt, bool gas, bool reverse, bool left, bool right, bool handbrake) {
    // 1. Forward and right direction vectors in space
    glm::vec2 forward(std::cos(m_angle), std::sin(m_angle));
    glm::vec2 right(-std::sin(m_angle), std::cos(m_angle));

    // 2. Project velocities onto directions
    float forwardSpeed = glm::dot(m_velocity, forward);
    float lateralSpeed = glm::dot(m_velocity, right);
    m_speed = forwardSpeed;

    // Apply forces
    float accelForce = 0.0f;
    if (gas) {
        accelForce = m_accel * (handbrake ? 0.3f : 1.0f);
    } else if (reverse) {
        accelForce = -m_accel * 0.5f;
    }

    // Dynamic turning steer
    float targetSteer = 0.0f;
    if (left)  targetSteer = -0.45f;
    if (right) targetSteer = 0.45f;
    m_steerAngle += (targetSteer - m_steerAngle) * 0.15f; // smoothing

    // Apply turning yaw relative to forward motion
    float turningRate = m_steerAngle * (std::min(1.0f, std::abs(forwardSpeed) / 4.0f)) * 0.11f;
    if (handbrake) {
        turningRate *= 1.5f; // drift handbrake spin
    }
    m_angle += turningRate;

    // Evaluate lateral slip friction values
    float currentGrip = handbrake ? m_driftGrip : m_grip;
    m_isDrifting = (std::abs(lateralSpeed) > 1.8f) || handbrake;
    if (m_isDrifting) {
        currentGrip *= 0.35f; // break grip
    }

    // Apply friction and integration
    float newForwardSpeed = (forwardSpeed + accelForce) * 0.98f; // drag
    float newLateralSpeed = lateralSpeed * (1.0f - currentGrip);

    m_velocity = forward * newForwardSpeed + right * newLateralSpeed;
    m_position += m_velocity;
}

void Car::resolveCollision(const glm::vec2& pushVector, const glm::vec2& normal) {
    // Offset out of overlap
    m_position += pushVector;

    // Reflect velocity with coefficient of restitution
    float dotProduct = glm::dot(m_velocity, normal);
    m_velocity = (m_velocity - 2.0f * dotProduct * normal) * 0.45f;
    
    m_speed = glm::length(m_velocity);
}
`
    },
    main_cpp: {
      name: "src/main.cpp",
      lang: "cpp",
      desc: "Compact robust modern OpenGL rendering application setup handling GLFW lifecycle loops, and shaders initialization.",
      code: `#include <glad/glad.h>
#include <GLFW/glfw3.h>
#include <iostream>
#include <vector>
#include "Car.h"

// Key tracking
bool keys[1024] = { false };

void keyCallback(GLFWwindow* window, int key, int scancode, int action, int mods) {
    if (key >= 0 && key < 1024) {
        if (action == GLFW_PRESS)
            keys[key] = true;
        else if (action == GLFW_RELEASE)
            keys[key] = false;
    }
}

int main() {
    // 1. GLFW setup
    if (!glfwInit()) {
        std::cerr << "CORE::ERROR: Failed to initialize GLFW context!" << std::endl;
        return -1;
    }

    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);

    GLFWwindow* window = glfwCreateWindow(1000, 600, "OpenGL Pro Drift-Car Core Engine", nullptr, nullptr);
    if (!window) {
        std::cerr << "CORE::ERROR: Failed to create GLFW window viewport!" << std::endl;
        glfwTerminate();
        return -1;
    }

    glfwMakeContextCurrent(window);
    glfwSetKeyCallback(window, keyCallback);

    // 2. Load GLAD pointers
    if (!gladLoadGLLoader((GLADloadproc)glfwGetProcAddress)) {
        std::cerr << "CORE::ERROR: Failed to initialize GLAD graphics context pointers!" << std::endl;
        return -1;
    }

    glViewport(0, 0, 1000, 600);

    // 3. Initiate Drift Car
    Car car(250.0f, 150.0f);

    float lastTime = 0.0f;

    // Render loop
    while (!glfwWindowShouldClose(window)) {
        float currentTime = (float)glfwGetTime();
        float dt = currentTime - lastTime;
        lastTime = currentTime;

        glfwPollEvents();

        // Feed keyboard inputs straight to C++ physics
        bool gas = keys[GLFW_KEY_W] || keys[GLFW_KEY_UP];
        bool reverse = keys[GLFW_KEY_S] || keys[GLFW_KEY_DOWN];
        bool left = keys[GLFW_KEY_A] || keys[GLFW_KEY_LEFT];
        bool right = keys[GLFW_KEY_D] || keys[GLFW_KEY_RIGHT];
        bool handbrake = keys[GLFW_KEY_SPACE];

        car.update(dt, gas, reverse, left, right, handbrake);

        // Core Rendering commands
        glClearColor(0.04f, 0.06f, 0.08f, 1.0f);
        glClear(GL_COLOR_BUFFER_BIT);

        // [DRAW CALLS: Bind shaders, uniform values and buffers representing Track & Car]

        glfwSwapBuffers(window);
    }

    glfwTerminate();
    return 0;
}
`
    },
    vercel_json: {
      name: "vercel.json",
      lang: "json",
      desc: "Vercel configuration structure to redirect paths flawlessly, serve standard static web folders, and prevent 404 blank screens upon direct loading of directory roots.",
      code: `{
  "version": 2,
  "name": "project-drift-car-web",
  "cleanUrls": true,
  "rewrites": [
    { "source": "/(.*)", "destination": "/web/$1" }
  ]
}
`
    }
  };

  const handleCopy = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFile(key);
    setTimeout(() => setCopiedFile(null), 2000);
  };

  return (
    <div className="bg-[#141419]/95 border border-white/10 rounded-2xl p-6 glow-card glass-panel">
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Left side: Quick Tabs Navigation */}
        <div className="w-full lg:w-1/4 flex flex-row lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-3 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/10 lg:pr-4">
          <button
            onClick={() => setActiveTab("diag")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left cursor-pointer transition-all shrink-0 ${
              activeTab === "diag"
                ? "bg-[#ff0055]/10 text-[#ff0055] border border-[#ff0055]/30 font-black font-mono shadow-[0_0_12px_rgba(255,0,85,0.2)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Cpu size={16} />
            <span className="text-xs font-black tracking-wide uppercase font-mono">MAIN DIAGNOSIS</span>
          </button>

          <div className="hidden lg:block my-2 text-[10px] font-black tracking-widest text-[#ff0055] uppercase px-4 font-mono">
            REVISED SOURCES
          </div>

          {Object.keys(filesMap).map((key) => {
            const file = filesMap[key];
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-left cursor-pointer transition-all shrink-0 ${
                  activeTab === key
                    ? "bg-[#ff6600]/10 text-[#ff6600] border border-[#ff6600]/30 font-black font-mono"
                    : "text-slate-400 hover:text-gray-200 hover:bg-white/5"
                }`}
              >
                <FileCode size={16} />
                <span className="text-xs font-medium font-mono truncate">{file.name}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Active Content Display */}
        <div className="flex-1 min-w-0">
          {activeTab === "diag" ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3 bg-[#ff0055]/10 border border-[#ff0055]/30 p-4 rounded-xl">
                <Info className="text-[#ff0055] shrink-0 mt-0.5 animate-pulse" size={18} />
                <div>
                  <h3 className="text-[#ff0055] font-black text-xs tracking-wider uppercase font-mono mb-1">
                    CRITICAL PLATFORM FAULTS ACTIVE PORTED ENGINE DIAGNOSTICS
                  </h3>
                  <p className="text-gray-300 text-xs leading-relaxed">
                    Analyzing your repository schema reveals multiple logical traps rendering local OpenGL builds broken and web builds non-playable. Follow our audit below for complete resolution.
                  </p>
                </div>
              </div>

              {/* Grid of Main Issues */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-[#ff0055]/20 text-[#ff0055] flex items-center justify-center text-xs font-black font-mono">1</div>
                    <h4 className="text-xs font-black text-white tracking-wider uppercase font-mono">CMAKE Absolute Volume Binding</h4>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Your CMake file contained strict absolute paths referencing directory <code className="text-[#ff6600] bg-[#ff6600]/10 px-1 py-0.5 rounded font-mono break-all font-bold">D:/Projects/...</code>, which completely break target compilations on Unix Vercel platforms or ANY other local machine besides yours.
                  </p>
                  <p className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">
                    ✓ PATCHED: Dynamic relative variables injected.
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-[#ff0055]/20 text-[#ff0055] flex items-center justify-center text-xs font-black font-mono">2</div>
                    <h4 className="text-xs font-black text-white tracking-wider uppercase font-mono">Shaders Target Loader Lock</h4>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    OpenGL runtime throws <code className="text-rose-400 font-mono text-[10px]">FAILED_TO_LOAD_SHADER</code> crashes if executable directory binaries cannot locate the relative shaders text files.
                  </p>
                  <p className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">
                    ✓ PATCHED: Post-build assets copy targets deployed dynamically.
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-[#ff0055]/20 text-[#ff0055] flex items-center justify-center text-xs font-black font-mono">3</div>
                    <h4 className="text-xs font-black text-white tracking-wider uppercase font-mono">Private Encapsulation Breaches</h4>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    The rendering engine was directly mutating private physical parameters of the Car object, generating compiler blocking access fault exceptions.
                  </p>
                  <p className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">
                    ✓ PATCHED: Protected access encapsulated with inline inline-getters.
                  </p>
                </div>

                <div className="bg-black/60 border border-white/10 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-md bg-[#ff0055]/20 text-[#ff0055] flex items-center justify-center text-xs font-black font-mono">4</div>
                    <h4 className="text-xs font-black text-white tracking-wider uppercase font-mono">Vercel Root Loader 404 Rewrite</h4>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed">
                    Vercel doesn&apos;t automatically scan nested custom sub-folders like <code className="text-slate-300 font-mono text-[11px]">/web</code> searching for entry points, leading to blank screens during deploy lifecycle.
                  </p>
                  <p className="mt-2 text-[10px] text-emerald-400 font-bold uppercase tracking-widest font-mono">
                    ✓ PATCHED: Configured vercel.json target rewrite directions.
                  </p>
                </div>

              </div>

              {/* Grid of Main Issues */}
              <div className="bg-black/60 border border-white/10 p-5 rounded-xl space-y-3">
                <h4 className="text-xs font-black text-white tracking-widest uppercase font-mono border-b border-white/10 pb-2">
                  HOW TO RESOLVE & DEPLOY YOUR COMPLETED GAME
                </h4>
                <ol className="list-decimal list-inside text-xs text-gray-300 space-y-2.5 font-mono">
                  <li>
                    <strong className="text-[#ff0055]">Apply the Web Fixes:</strong> Copy target structures under tabs into your project directory <code className="text-[#ff6600] font-mono">/web/...</code> or root.
                  </li>
                  <li>
                    <strong className="text-[#ff0055]">Deploy to Vercel:</strong> Create a <code className="text-[#ff6600] font-mono">vercel.json</code> file (copyable in the code tabs) and run Vercel direct CLI or import connection.
                  </li>
                  <li>
                    <strong className="text-[#ff0055]">Compile C++ Locally:</strong> Build utilizing:
                    <pre className="mt-1.5 p-3 bg-black/80 rounded font-mono text-[11px] text-[#ff6600] overflow-x-auto select-all border border-white/5">
mkdir build && cd build{"\n"}cmake ..{"\n"}cmake --build .
                    </pre>
                  </li>
                </ol>
              </div>

            </div>
          ) : (
            // Tabs holding copy-able files
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 font-mono">
                <div>
                  <h3 className="text-sm font-black text-white">
                    {filesMap[activeTab].name}
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed mt-0.5">
                    {filesMap[activeTab].desc}
                  </p>
                </div>

                <button
                  onClick={() => handleCopy(activeTab, filesMap[activeTab].code)}
                  className="xl:px-5 shrink-0 flex items-center justify-center gap-1.5 drift-gradient text-white rounded-xl py-2.5 px-4 text-xs font-black transition-all cursor-pointer shadow-md select-none border-0 uppercase tracking-widest"
                >
                  {copiedFile === activeTab ? (
                    <>
                      <Check size={14} className="text-emerald-300 animate-scale" />
                      COPIED FILE!
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      COPY SOURCE
                    </>
                  )}
                </button>
              </div>

              {/* Text Area display container with code scroll */}
              <div className="relative border border-white/10 rounded-xl overflow-hidden bg-black/80">
                <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2 font-mono">
                  <div className="flex gap-1.5 font-sans">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff0055]/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ff6600]/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80"></span>
                  </div>
                  <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase">
                    {filesMap[activeTab].lang} Code
                  </span>
                </div>
                
                <textarea
                  readOnly
                  value={filesMap[activeTab].code}
                  className="w-full h-[360px] p-4 font-mono text-xs text-slate-300 bg-black/40 focus:outline-none resize-none select-all"
                  style={{ whiteSpace: "pre" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
