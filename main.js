import 'ol/ol.css';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import OSM from 'ol/source/OSM';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import { Style, Fill, Stroke, Circle } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';

// Fonte de dados para os pontos de praia
const vectorSource = new VectorSource();

// Estilos para pontos próprios e impróprios
const styles = {
  proprio: new Style({
    image: new Circle({
      fill: new Fill({ color: 'green' }),
      stroke: new Stroke({ color: 'darkgreen', width: 2 }),
      radius: 8
    })
  }),
  improprio: new Style({
    image: new Circle({
      fill: new Fill({ color: 'red' }),
      stroke: new Stroke({ color: 'darkred', width: 2 }),
      radius: 8
    })
  })
};

// Layer para os pontos de praia
const vectorLayer = new VectorLayer({
  source: vectorSource,
  style: function(feature) {
    return styles[feature.get('status')];
  }
});

// Mapa
const map = new Map({
  target: 'map',
  layers: [
    new TileLayer({
      source: new OSM()
    }),
    vectorLayer
  ],
  view: new View({
    center: fromLonLat([-35.7089, -9.6658]), // Coordenadas da Praia de Jatiúca, Maceió/AL
    zoom: 13
  })
});

// Array para armazenar os dados das praias
let praias = [];

// Função para salvar dados na API (uma praia por vez)
async function salvarPraiaNaAPI(praia) {
  try {
    const response = await fetch('http://localhost:8080/api/praias', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nome: praia.nome,
        status: praia.status,
        coordenadas: [praia.longitude, praia.latitude] // Enviar como array [longitude, latitude]
      })
    });
    
    if (response.ok) {
      const praiaSalva = await response.json();
      console.log('Praia salva:', praiaSalva);
      return praiaSalva;
    } else {
      console.error('Erro ao salvar praia:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Erro de conexão:', error);
    return null;
  }
}

// Função para deletar praia da API
async function deletarPraiaDaAPI(id) {
  try {
    const response = await fetch(`http://localhost:8080/api/praias/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('Erro ao deletar praia:', error);
    return false;
  }
}

// Função para adicionar ponto de praia
async function adicionarPraia(coordenadas, nome, status) {
  const feature = new Feature({
    geometry: new Point(coordenadas),
    nome: nome,
    status: status,
    coordenadas: toLonLat(coordenadas)
  });

  // Criar objeto da praia (sem ID ainda)
  const novaPraia = {
    nome: nome,
    status: status,
    latitude: toLonLat(coordenadas)[1],
    longitude: toLonLat(coordenadas)[0]
  };
  
  // Salvar na API primeiro
  const praiaSalva = await salvarPraiaNaAPI(novaPraia);
  
  if (praiaSalva) {
    // Adicionar ID da API e outras propriedades
    feature.set('id', praiaSalva.id);
    vectorSource.addFeature(feature);
    praias.push(praiaSalva);
    console.log('✅ Praia salva automaticamente na API');
    atualizarLista();
  } else {
    alert('❌ Erro ao salvar na API. Praia não foi adicionada.');
  }
}

// Função para atualizar a lista de praias
function atualizarLista() {
  const lista = document.getElementById('lista-praias');
  lista.innerHTML = '';
  
  praias.forEach(praia => {
    const item = document.createElement('div');
    item.className = `praia-item ${praia.status}`;
    item.innerHTML = `
      <div class="praia-info">
        <strong>${praia.nome}</strong>
        <span class="status ${praia.status}">${praia.status.toUpperCase()}</span>
        <small>Lat: ${praia.latitude.toFixed(6)}, Lon: ${praia.longitude.toFixed(6)}</small>
      </div>
      <button onclick="removerPraia(${praia.id})" class="btn-remove">Remover</button>
    `;
    lista.appendChild(item);
  });
}

// Função para remover praia
window.removerPraia = async function(id) {
  if (confirm('Deseja realmente remover esta praia?')) {
    // Deletar da API primeiro
    const deletou = await deletarPraiaDaAPI(id);
    
    if (deletou) {
      // Remover do array local
      praias = praias.filter(p => p.id !== id);
      
      // Remover do mapa
      vectorSource.getFeatures().forEach(feature => {
        if (feature.get('id') === id) {
          vectorSource.removeFeature(feature);
        }
      });
      
      atualizarLista();
      console.log('✅ Praia removida da API e do mapa');
    } else {
      alert('❌ Erro ao remover praia da API');
    }
  }
};

// Função para carregar praias existentes da API
async function carregarPraiasAPI() {
  try {
    const response = await fetch('http://localhost:8080/api/praias');
    if (response.ok) {
      const praiasAPI = await response.json();
      
      // Limpar arrays e mapa antes de carregar
      praias = [];
      vectorSource.clear();
      
      praiasAPI.forEach(praia => {
        // Verificar se tem coordenadas válidas
        let longitude, latitude;
        
        if (praia.coordenadas && praia.coordenadas.length === 2 && 
            praia.coordenadas[0] !== 0 && praia.coordenadas[1] !== 0) {
          // Usar coordenadas do array [longitude, latitude]
          longitude = praia.coordenadas[0];
          latitude = praia.coordenadas[1];
        } else if (praia.longitude && praia.latitude) {
          // Usar longitude e latitude separados
          longitude = praia.longitude;
          latitude = praia.latitude;
        } else {
          console.warn('Praia sem coordenadas válidas:', praia);
          return; // Pular esta praia
        }
        
        const coordenadas = fromLonLat([longitude, latitude]);
        const feature = new Feature({
          geometry: new Point(coordenadas),
          nome: praia.nome,
          status: praia.status,
          id: praia.id,
          coordenadas: [longitude, latitude]
        });
        
        vectorSource.addFeature(feature);
        
        // Padronizar objeto da praia
        praias.push({
          id: praia.id,
          nome: praia.nome,
          status: praia.status,
          latitude: latitude,
          longitude: longitude
        });
      });
      
      atualizarLista();
      console.log(`✅ ${praiasAPI.length} praias carregadas da API`);
    }
  } catch (error) {
    console.error('Erro ao carregar praias da API:', error);
  }
}

// Event listener para cliques no mapa
map.on('click', function(evt) {
  const coordenadas = evt.coordinate;
  
  // Mostrar modal para entrada de dados
  const nome = prompt('Nome da praia:');
  if (!nome) return;
  
  const status = confirm('A praia é PRÓPRIA para banho?\n\nOK = Própria\nCancelar = Imprópria') 
    ? 'proprio' : 'improprio';
  
  adicionarPraia(coordenadas, nome, status);
});

// Event listener para botão limpar
document.getElementById('btn-limpar').addEventListener('click', async function() {
  if (confirm('Deseja limpar todos os pontos? Isso também removerá da API!')) {
    // Deletar todas da API
    for (const praia of praias) {
      await deletarPraiaDaAPI(praia.id);
    }
    
    // Limpar localmente
    vectorSource.clear();
    praias = [];
    atualizarLista();
    console.log('✅ Todas as praias foram removidas');
  }
});

// Carregar praias existentes ao inicializar
carregarPraiasAPI();

console.log('Sistema de Balneabilidade carregado!');
console.log('Clique no mapa para adicionar pontos de praia');