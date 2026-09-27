package plugins

import (
	"errors"
	"os"
	"path/filepath"
	goplugin "plugin"
	"sync"
	"testing"

	"github.com/district-cg/api/internal/kernel"
)

type mockArtifact struct {
	sym goplugin.Symbol
	err error
}

func (m *mockArtifact) Lookup(name string) (goplugin.Symbol, error) {
	if m.err != nil {
		return nil, m.err
	}
	return m.sym, nil
}

func TestRuntimeLoader_DirectoryNotExist(t *testing.T) {
	reg := kernel.NewRegistry()
	loader := newRuntimeLoader(reg, "/non/existent/path/12345")
	// Should not panic or crash
	loader.loadExisting()
}

func TestRuntimeLoader_LoadSuccess(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "plugins-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	pluginFile := filepath.Join(tmpDir, "test_plugin.so")
	if err := os.WriteFile(pluginFile, []byte("fake so content"), 0644); err != nil {
		t.Fatalf("failed to write fake so file: %v", err)
	}

	calledRegister := false
	var mu sync.Mutex
	fakeRegister := func(r kernel.Registrar) {
		mu.Lock()
		calledRegister = true
		mu.Unlock()
	}

	origOpen := openPlugin
	defer func() { openPlugin = origOpen }()

	openPlugin = func(path string) (pluginArtifact, error) {
		return &mockArtifact{sym: fakeRegister}, nil
	}

	reg := kernel.NewRegistry()
	loader := newRuntimeLoader(reg, tmpDir)

	loader.loadExisting()

	mu.Lock()
	didRegister := calledRegister
	mu.Unlock()

	if !didRegister {
		t.Errorf("expected plugin Register function to be called")
	}

	// Calling load again on the same path should be a no-op (already loaded)
	mu.Lock()
	calledRegister = false
	mu.Unlock()

	loader.load(pluginFile)

	mu.Lock()
	reRegistered := calledRegister
	mu.Unlock()

	if reRegistered {
		t.Errorf("expected already loaded plugin not to be re-registered")
	}
}

func TestRuntimeLoader_OpenError(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "plugins-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	pluginFile := filepath.Join(tmpDir, "bad_open.so")
	_ = os.WriteFile(pluginFile, []byte("fake"), 0644)

	origOpen := openPlugin
	defer func() { openPlugin = origOpen }()

	openPlugin = func(path string) (pluginArtifact, error) {
		return nil, errors.New("cannot open file")
	}

	reg := kernel.NewRegistry()
	loader := newRuntimeLoader(reg, tmpDir)
	loader.load(pluginFile)

	if _, ok := loader.loaded[pluginFile]; ok {
		t.Errorf("expected failed open not to be marked loaded")
	}
}

func TestRuntimeLoader_LookupError(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "plugins-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	pluginFile := filepath.Join(tmpDir, "no_sym.so")
	_ = os.WriteFile(pluginFile, []byte("fake"), 0644)

	origOpen := openPlugin
	defer func() { openPlugin = origOpen }()

	openPlugin = func(path string) (pluginArtifact, error) {
		return &mockArtifact{err: errors.New("symbol not found")}, nil
	}

	reg := kernel.NewRegistry()
	loader := newRuntimeLoader(reg, tmpDir)
	loader.load(pluginFile)

	if _, ok := loader.loaded[pluginFile]; ok {
		t.Errorf("expected failed lookup not to be marked loaded")
	}
}

func TestRuntimeLoader_IncompatibleSymbol(t *testing.T) {
	tmpDir, err := os.MkdirTemp("", "plugins-test-*")
	if err != nil {
		t.Fatalf("failed to create temp dir: %v", err)
	}
	defer os.RemoveAll(tmpDir)

	pluginFile := filepath.Join(tmpDir, "wrong_type.so")
	_ = os.WriteFile(pluginFile, []byte("fake"), 0644)

	origOpen := openPlugin
	defer func() { openPlugin = origOpen }()

	openPlugin = func(path string) (pluginArtifact, error) {
		// Return wrong symbol type (int instead of func(kernel.Registrar))
		return &mockArtifact{sym: 42}, nil
	}

	reg := kernel.NewRegistry()
	loader := newRuntimeLoader(reg, tmpDir)
	loader.load(pluginFile)

	if _, ok := loader.loaded[pluginFile]; ok {
		t.Errorf("expected incompatible symbol not to be marked loaded")
	}
}

func TestRegisterAll(t *testing.T) {
	// RegisterAll calls courierrush.Register and starts loader
	RegisterAll()
	// Calling a second time should also not panic (registerOnce)
	RegisterAll()
}
