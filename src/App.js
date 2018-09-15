import React, { Component } from 'react'
import { Loader, Dimmer, Header, Search, Grid, Segment, Image } from 'semantic-ui-react'
import Slider from "react-slick"
import axios from 'axios'
import Clarifai from 'clarifai'
import RadarChart from './RadarChart'
import Typist from 'react-typist'
import TypistLoop from 'react-typist-loop'

import mhilogo from './mhi_logo.png'

import './App.css'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'semantic-ui-css/semantic.min.css'

// LOL please don't steal our free API key lmao
const clarifaiApp = new Clarifai.App({
  apiKey: `6bcf849cc1b04b889d8ab09af9b516f5`
})

class InstagramSearch extends Component {
  state = {
    isLoading: false,
    results: [],
    value: '',
    timeout: null
  }

  handleResultSelect = async (e, { result }) => {
    this.props.setHasSearched(true)

    this.setState({ value: result.title })

    // Goddamnit CORS on instagram
    this.props.setComputingText('Loading...')
    this.props.setIsComputing(true)
    const { data, followers } = await axios.post('https://us-central1-hack-the-north-2018-216509.cloudfunctions.net/getInstagramUserProfile', {username: result.title}).then(x => x.data)

    this.props.setComputingText('Extracting color information...')
    const comments = data.map(x => x.comments)
    const likes = data.map(x => x.likes)
    const pictures = data.map(x => x.picture)

    // Get data on Color
    const colorData = await clarifaiApp.models.predict('eeed0b6733a644cea07cf4c60f87ebb7', pictures)
                        .then(x => x.outputs)

    // Get data on moderation
    this.props.setComputingText('Extracting moderation information...')
    const moderationData = await clarifaiApp.models.predict('d16f390eb32cad478c7ae150069bd2c6', pictures)
                        .then(x => x.outputs)

    // General (can see person, but can't see faces)
    this.props.setComputingText('Extracting general information...')
    const generalData = await clarifaiApp.models.predict('aaa03c23b3724a16a56b629203edc62c', pictures)
                        .then(x => x.outputs)

    // Calculate depressiveness
    // Colors that indicate depression
    // If > 2 colors have > 25% then its likely
    // OR if 2 colors have > 40% then its likely
    // If > 75% of the colors are listed below then its likely

    // 1. Rosybrown + black
    // 2. Rosybrown + black + magenta (super strong)
    // 3. *Gray (weak)
    // 4. MediumPurple + black (strong)
    // 5. BlueViolet + black
    // 6. Indigo + black
    // 7. *Gray + Black
    // 8. *Gray + Black + PaleGoldenRod
    // 9. Thistle + Black
    // 10. Dark Orchid + Black
    // 11. Linen + Black
    // 12. Dark Salmon
    const depressingColorsDict = {
      rosybrown: true,
      black: true,
      magenta: true,
      mediumpurple: true,
      blueviolet: true,
      indigo: true,
      palegoldenrod: true,
      thistle: true,
      darkorchid: true,
      darksalmon: true,
    }

    const colorScores = colorData.map((c) => {
      const colors = c.data.colors.filter(x => x.value > 0.2)
      const depressingColors = colors.filter(x => {
        const xprime = x.w3c.name.toLowerCase()
        return depressingColorsDict[xprime] || false
      })

      if (depressingColors.length < 1) {
        return 0
      }

      return 1
    })

    // Moderation, check for drugs and gore
    // 1. drugs
    // 2. gore
    const moderationScores = moderationData.map(c => {
      const depressingConcepts = c.data.concepts
        .filter(x => x.value > 0.75)
        .filter(x => {
          return x.name === 'drug' || x.name === 'gore'
        })
      
      return (depressingConcepts.length > 0 ? 1 : 0)
    })

    // General data (filter out <0.75 confidence)
    // 1. one
    // 2. people
    // 3. smoke
    // 4. dark
    // 5. has one/people/girl/man in it, but lacks facial expression
    const generalScores = generalData.map((c) => {
      const generalConcepts = c.data.concepts
        .filter(x => x.value > 0.75)
        .map(x => x.name)
        .reduce((map, a) => {
          map[a] = true;
          return map
        }, {'facial expression': false, 'one': false, 'people': false, 'smoke': false, 'dark': false, 'girl': false, 'man': false})

      // If has people and no facial expression
      if ((generalConcepts['one'] || generalConcepts['people'] || generalConcepts['man'] || generalConcepts['girl'])){
        if (!generalConcepts['facial expression']) {
          return 1
        }
      }

      return 0
    })

    // IF user has < 1k followers,
    // then if User like is < 10% of following, then + 1
    // else if < 3% following, then + 1
    const likeEngagementScores = likes.map(x => {
      if (followers > 1000) {
        if (x < followers * 0.03) {
          return 1
        }
        return 0
      } else {
        return (x < followers * 0.1) ? 1 : 0
      }
    })

    // Has recurring < 3 comments
    const commentEngagementScores = comments.map(x => {
      return (x > 3) ? 0 : 1
    })

    const possiblyDepressedPictures = pictures.reduce((acc, x, i) => {
      // If score > 4 then its probably
      // bad score
      const totalScore = commentEngagementScores[i] +
                    likeEngagementScores[i] +
                    generalScores[i] + 
                    moderationScores[i] +
                    colorScores[i]
      
      if (totalScore >= 4) {
        acc.push({
          commentDisengagement: commentEngagementScores[i],
          likeDisengagement: likeEngagementScores[i],
          generalScore: generalScores[i],
          moderationScore: moderationScores[i],
          colorScore: colorScores[i],
          image: pictures[i]
        })
      }
      return acc
    }, [])

    this.props.setPossiblyDepressedPictures(possiblyDepressedPictures)
    this.props.setIsComputing(false)
  }

  handleSearchChange = (e, { value }) => {
    clearTimeout(this.state.timeout)

    const timeout = setTimeout(async () => {
      const queryURL = 'https://www.instagram.com/web/search/topsearch/?context=blended&query=' + value
      const results = await axios.get(queryURL)
      const userResults = results.data.users.slice(0, 24).map((x) => {
        return {
          title: x.user.username,
          description: x.user.full_name,
          image: x.user.profile_pic_url,
          isprivate: x.user.is_private
        }
      })

      this.setState({ isLoading: false, results: userResults })
    }, 500)

    this.setState({ isLoading: true, value, timeout })
  }

  render() {
    const { isLoading, results, value } = this.state

    return (
      <Search
        input={{ fluid: true }}
        loading={isLoading}
        onResultSelect={this.handleResultSelect}
        onSearchChange={this.handleSearchChange}
        placeholder="Instagram handle"
        results={results}
        value={value}
        isprivate='false'
      />
    )
  }
}

class Summary extends Component {
  render () {
    const { depressingPicsNo } = this.props

    if (depressingPicsNo === 0) {
      return (
        <h3 style={{paddingTop: '50px'}}>
          No symptoms found!
        </h3>
      )
    }

    return (
      <h3 style={{paddingTop: '50px'}}>
        Identified <strong>{depressingPicsNo}</strong> images that displays symptoms related to poor mental health.
      </h3>
    )
  }
}

class FirstPage extends Component {
  render () {
    return (
      <div>
        <Header as='h2' textAlign='center'>
        <Image src={mhilogo} size='large'/>
        <Header.Content>
        <TypistLoop interval={3000}>
          {[
            'Mental Health on Instagram',
            'Match Symptoms from Instagram Posts',
            'MHI',
          ].map(text => <Typist key={text} startDelay={1000}>{text}</Typist>)}
        </TypistLoop>
        </Header.Content>
      </Header>
      <InstagramSearch
        setHasSearched={this.props.setHasSearched}
        setComputingText={this.props.setComputingText}
        setPossiblyDepressedPictures={this.props.setPossiblyDepressedPictures}
        setIsComputing={this.props.setIsComputing}
        />
      </div>
    )
  }
}

class SecondPage extends Component {
  render () {
    const { possiblyDepressedPictures, isComputing, computingText } = this.props
    return ( 
      isComputing ?
      <Segment style={{height: '100vh'}}>
        <Dimmer active inverted>
          <Loader>{computingText}</Loader>
        </Dimmer>
      </Segment>
      :
      <div style={{marginTop: '100px'}}>
        <Summary depressingPicsNo={possiblyDepressedPictures.length} />
        <hr />
        <Slider
          dots={true}
          fade={true}
          arrows={true}
          className='slides'
        >
          {
            possiblyDepressedPictures.map((x) => {
              return (
                <Grid columns={2}>
                  <Grid.Row>
                    <Grid.Column>
                      <RadarChart {...x} />
                    </Grid.Column>
                    <Grid.Column>
                      <Image centered={true} height={350} src={x.image} />
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              )
            })
          }
        </Slider>
        <br/><br/><br/>
        <hr />
        <p>
          Implementation loosely based on <a href='https://arxiv.org/pdf/1608.03282.pdf'>this arxiv paper.</a><br/>
          <a href='#' onClick={() => this.props.setHasSearched(false)}>Do another search.</a>
        </p>
      </div>
    )
  }
}

class App extends Component {
  state = {
    hasSearched: false,
    isComputing: false,
    computingText: 'Loading...',
    possiblyDepressedPictures: undefined
  }

  setHasSearched = (b) => {
    this.setState({ hasSearched: b })
  }

  setComputingText = (t) => {
    this.setState({ computingText: t })
  }

  setIsComputing = (b) => {
    this.setState({ isComputing: b })
  }

  setPossiblyDepressedPictures = (p) => {
    this.setState({ possiblyDepressedPictures: p })
  }

  render() {
    const { hasSearched, isComputing, computingText, possiblyDepressedPictures } = this.state

    return (
      <Grid columns={3} verticalAlign='middle' style={{ height: '100vh' }}>
        <Grid.Row stretched verticalAlign='middle'>
          <Grid.Column width={2}/>
          <Grid.Column verticalAlign='middle' textAlign='center' width={12}>
            <Segment vertical textAlign='center' style={{marginTop: '-15vh'}}>
              {
                !hasSearched ?
                <FirstPage
                  setHasSearched={this.setHasSearched}
                  setComputingText={this.setComputingText}
                  setPossiblyDepressedPictures={this.setPossiblyDepressedPictures}
                  setIsComputing={this.setIsComputing}
                /> :
                <SecondPage
                  possiblyDepressedPictures={possiblyDepressedPictures}
                  isComputing={isComputing}
                  computingText={computingText}
                  setHasSearched={this.setHasSearched}
                />
              }
            </Segment>
          </Grid.Column>
          <Grid.Column width={2}/>
        </Grid.Row>
      </Grid>
    )
  }
}

export default App
